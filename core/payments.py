import hashlib
import uuid
import json
import time
import urllib.parse
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .models import UserPurchase, PremiumMealPlan
import logging

logger = logging.getLogger(__name__)


def get_robokassa_passwords():
    """
    Возвращает пароли для Robokassa в зависимости от режима (тест/прод)
    """
    if settings.ROBOKASSA_TEST_MODE:
        logger.info("Using TEST passwords for Robokassa")
        return settings.ROBOKASSA_TEST_PASSWORD1, settings.ROBOKASSA_TEST_PASSWORD2
    else:
        logger.info("Using PRODUCTION passwords for Robokassa")
        return settings.ROBOKASSA_PASSWORD1, settings.ROBOKASSA_PASSWORD2


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def payment_result(request):
    """
    Обработка уведомления от Robokassa (ResultURL)
    """
    try:
        logger.info("Robokassa ResultURL request received")

        # Получаем параметры
        out_sum = request.POST.get('OutSum') or request.POST.get('out_summ', '').strip()
        inv_id = request.POST.get('InvId') or request.POST.get('inv_id', '').strip()
        signature_value = request.POST.get('SignatureValue') or request.POST.get('crc', '').strip().upper()
        is_test = request.POST.get('IsTest', '0').strip()

        # Проверяем обязательные параметры
        if not out_sum or not inv_id or not signature_value:
            logger.error(f"Missing required parameters: OutSum={out_sum}, InvId={inv_id}, SignatureValue={signature_value}")
            return HttpResponse('ERROR: Missing required parameters', status=400)

        # Преобразуем InvId в число
        try:
            inv_id_int = int(inv_id)
        except (TypeError, ValueError):
            logger.error(f"Invalid InvId format: {inv_id}")
            return HttpResponse('ERROR: Invalid InvId format', status=400)

        # Собираем пользовательские параметры (Shp_*)
        shp_params = {}
        for key, value in request.POST.items():
            if key.startswith('Shp_'):
                shp_params[key] = value.strip()

        # Сортируем пользовательские параметры по алфавиту
        sorted_shp_params = sorted(shp_params.items())

        # Получаем пароль для проверки подписи
        password1, password2 = get_robokassa_passwords()

        # Правильная база для расчета контрольной суммы
        signature_base = f"{out_sum}:{inv_id}:{password2}"

        # Добавляем пользовательские параметры если они есть
        for key, value in sorted_shp_params:
            signature_base += f":{key}={value}"

        # Рассчитываем ожидаемую подпись (MD5 в верхнем регистре)
        expected_signature = hashlib.md5(signature_base.encode('utf-8')).hexdigest().upper()

        # Проверяем подпись
        if signature_value != expected_signature:
            logger.error(f"Invalid signature for order #{inv_id}. Received: {signature_value}, Expected: {expected_signature}")
            return HttpResponse('ERROR: Invalid signature', status=400)

        # Ищем покупку по order_number
        try:
            purchase = UserPurchase.objects.get(order_number=inv_id_int)

            # Проверяем сумму (в тестовом режиме пропускаем несовпадение)
            expected_amount = str(purchase.price_paid) if purchase.price_paid else '0'

            try:
                received_amount_normalized = str(float(out_sum))
                expected_amount_normalized = str(float(expected_amount))
            except ValueError:
                received_amount_normalized = out_sum
                expected_amount_normalized = expected_amount

            if received_amount_normalized != expected_amount_normalized:
                logger.warning(f"Amount mismatch for order #{inv_id}. Received: {received_amount_normalized}, Expected: {expected_amount_normalized}")
                if not getattr(settings, 'ROBOKASSA_TEST_MODE', True) and is_test != '1':
                    return HttpResponse('ERROR: Amount mismatch', status=400)

            # Обновляем статус покупки
            purchase.status = 'paid'
            purchase.save()

            logger.info(f"Order #{inv_id} successfully marked as paid")

            # Robokassa ожидает ответ в формате OK{InvId}
            return HttpResponse(f'OK{inv_id}', content_type='text/plain')

        except UserPurchase.DoesNotExist:
            logger.error(f"Order not found: #{inv_id_int}")
            return HttpResponse('ERROR: Order not found', status=404)

    except Exception as e:
        logger.error(f"Unexpected error in payment_result: {str(e)}")
        return HttpResponse('ERROR: Internal server error', status=500)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def payment_success(request):
    """
    Обработка успешного платежа (SuccessURL)
    """
    try:
        inv_id = request.GET.get("InvId") or request.POST.get("InvId")

        if not inv_id:
            return Response({"error": "Missing InvId parameter"}, status=400)

        # ИСПРАВЛЕНО: ищем по order_number
        try:
            inv_id_int = int(inv_id)
        except (TypeError, ValueError):
            return Response({"error": "Invalid InvId format"}, status=400)

        try:
            purchase = UserPurchase.objects.get(order_number=inv_id_int)

            if purchase.status != "paid":
                return Response(
                    {
                        "success": False,
                        "message": "Платеж еще не подтвержден",
                        "purchase_id": str(purchase.id),  # UUID
                        "order_number": purchase.order_number,  # Число
                        "status": purchase.status,
                    }
                )

            return Response(
                {
                    "success": True,
                    "purchase_id": str(purchase.id),  # UUID
                    "order_number": purchase.order_number,  # Число
                    "menu_name": purchase.premium_meal_plan.name,
                    "status": purchase.status,
                }
            )

        except UserPurchase.DoesNotExist:
            return Response({"error": "Order not found"}, status=404)

    except Exception as e:
        logger.error(f"Error in payment_success: {str(e)}")
        return Response({"error": "Internal server error"}, status=500)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def payment_fail(request):
    """
    Обработка неудачного платежа (FailURL)
    """
    try:
        inv_id = request.GET.get("InvId") or request.POST.get("InvId")

        if not inv_id:
            return Response({"error": "Missing InvId parameter"}, status=400)

        # ИСПРАВЛЕНО: ищем по order_number
        try:
            inv_id_int = int(inv_id)
        except (TypeError, ValueError):
            return Response({"error": "Invalid InvId format"}, status=400)

        try:
            purchase = UserPurchase.objects.get(order_number=inv_id_int)

            if purchase.status != "paid":
                purchase.status = "cancelled"
                purchase.save()

            return Response(
                {
                    "success": False,
                    "purchase_id": str(purchase.id),  # UUID
                    "order_number": purchase.order_number,  # Число
                    "menu_name": purchase.premium_meal_plan.name,
                    "status": purchase.status,
                }
            )

        except UserPurchase.DoesNotExist:
            return Response({"error": "Order not found"}, status=404)

    except Exception as e:
        logger.error(f"Error in payment_fail: {str(e)}")
        return Response({"error": "Internal server error"}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment(request):
    """
    Создание платежа в Robokassa с фискализацией (чеком)
    """
    premium_meal_plan_id = request.data.get('premium_meal_plan_id')

    try:
        premium_meal_plan = PremiumMealPlan.objects.get(id=premium_meal_plan_id, is_active=True)
    except PremiumMealPlan.DoesNotExist:
        return Response({'error': 'Меню не найдено'}, status=404)

    # Проверяем, есть ли уже активная покупка (paid или processing)
    active_purchase = UserPurchase.objects.filter(
        user=request.user,
        premium_meal_plan=premium_meal_plan,
        status__in=['paid', 'processing']
    ).first()

    if active_purchase:
        if active_purchase.status == 'paid':
            return Response({'error': 'Меню уже куплено'}, status=400)
        elif active_purchase.status == 'processing':
            return Response({'error': 'Платеж уже в обработке'}, status=400)

    # Создаем новую покупку
    purchase = UserPurchase.objects.create(
        user=request.user,
        premium_meal_plan=premium_meal_plan,
        price_paid=premium_meal_plan.price,
        status='processing'
    )

    # Получаем пароли в зависимости от режима
    password1, password2 = get_robokassa_passwords()

    # Формируем параметры для Robokassa
    merchant_login = settings.ROBOKASSA_MERCHANT_LOGIN
    out_sum = str(float(premium_meal_plan.price)) if premium_meal_plan.price else '0'

    if not settings.ROBOKASSA_TEST_MODE:
        try:
            out_sum = f"{float(out_sum):.6f}"
        except ValueError:
            pass

    inv_id = purchase.order_number

    description = f'Оплата меню: {premium_meal_plan.name}'[:100]
    culture = 'ru'
    encoding = 'utf-8'
    is_test = '1' if settings.ROBOKASSA_TEST_MODE else '0'

    # Формируем чек для фискализации
    receipt_data = {
        "sno": getattr(settings, 'ROBOKASSA_SNO', 'osn'),
        "items": [
            {
                "name": premium_meal_plan.name[:128],
                "quantity": 1,
                "sum": float(out_sum),
                "payment_method": getattr(settings, 'ROBOKASSA_PAYMENT_METHOD', 'full_payment'),
                "payment_object": getattr(settings, 'ROBOKASSA_PAYMENT_OBJECT', 'service'),
                "tax": getattr(settings, 'ROBOKASSA_TAX', 'vat20')
            }
        ]
    }

    # Преобразуем чек в JSON строку
    receipt_json = json.dumps(receipt_data, ensure_ascii=False)

    # URL-кодируем чек для включения в подпись
    receipt_encoded = urllib.parse.quote(receipt_json, safe='')

    # Пользовательские параметры
    shp_params = {
        'Shp_user': str(request.user.id),
        'Shp_menu': str(premium_meal_plan.id),
        'Shp_purchase': str(purchase.id),
    }

    # ВАЖНО: Формируем базу для подписи С УЧЕТОМ ЧЕКА
    # Правильный формат: MerchantLogin:OutSum:InvId:Receipt:Password1:Shp_params...
    signature_base = f'{merchant_login}:{out_sum}:{inv_id}:{receipt_encoded}:{password1}'

    # Добавляем пользовательские параметры
    sorted_shp_params = sorted(shp_params.items())
    for key, value in sorted_shp_params:
        signature_base += f':{key}={value}'

    logger.info(f"Signature base for order #{inv_id}: {signature_base.replace(password1, '***')}")

    # Рассчитываем подпись
    signature_value = hashlib.md5(signature_base.encode(encoding)).hexdigest().lower()

    # Настройки для iFrame
    settings_param = {
        'PaymentMethods': ['BankCard', 'SBP'],
        'Mode': 'modal'
    }

    # Формируем параметры для передачи в Robokassa
    # ВАЖНО: передаем Receipt в URL-кодированном виде
    payment_params = {
        'MerchantLogin': merchant_login,
        'OutSum': out_sum,
        'InvId': inv_id,
        'Description': description,
        'Culture': culture,
        'Encoding': encoding,
        'IsTest': is_test,
        'SignatureValue': signature_value,
        'Settings': json.dumps(settings_param),
        'Receipt': receipt_encoded,  # Передаем чек в URL-кодированном виде
    }

    # Добавляем пользовательские параметры
    payment_params.update(shp_params)

    logger.info(f"Created payment with receipt for menu {premium_meal_plan.name}, Order: #{inv_id}")
    logger.info(f"Receipt data (encoded): {receipt_encoded}")

    return Response({
        'payment_params': payment_params,
        'purchase_id': str(purchase.id),
        'order_number': purchase.order_number,
        'menu_name': premium_meal_plan.name,
        'is_test': settings.ROBOKASSA_TEST_MODE
    })