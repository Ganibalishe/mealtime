import hashlib
import uuid
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import UserPurchase, PremiumMealPlan
import logging
from datetime import timezone
import json

logger = logging.getLogger(__name__)


@csrf_exempt
@api_view(["POST"])
def payment_result(request):
    """
    Обработка уведомления от Robokassa (ResultURL)
    Документация: https://docs.robokassa.ru/#1255
    """
    try:
        # Логируем входящий запрос для отладки
        logger.info(f"Robokassa ResultURL request: {request.POST}")

        # Получаем параметры из запроса
        out_sum = request.POST.get("OutSum", "").strip()
        inv_id = request.POST.get("InvId", "").strip()
        signature_value = request.POST.get("SignatureValue", "").strip().upper()
        fee = request.POST.get("Fee", "0").strip()
        email = request.POST.get("EMail", "").strip()
        payment_method = request.POST.get("PaymentMethod", "").strip()
        inc_curr_label = request.POST.get("IncCurrLabel", "").strip()

        # Собираем пользовательские параметры (Shp_*)
        shp_params = {}
        for key, value in request.POST.items():
            if key.startswith("Shp_"):
                shp_params[key] = value.strip()

        # Сортируем пользовательские параметры по алфавиту
        sorted_shp_params = sorted(shp_params.items())

        # Формируем базу для расчета контрольной суммы
        # База: OutSum:InvId:Пароль#2:Shp_param1=value1:Shp_param2=value2:...
        signature_base = f"{out_sum}:{inv_id}:{settings.ROBOKASSA_PASSWORD2}"

        # Добавляем пользовательские параметры если они есть
        for key, value in sorted_shp_params:
            signature_base += f":{key}={value}"

        logger.info(f"Signature base: {signature_base}")

        # Рассчитываем ожидаемую подпись (MD5 в верхнем регистре)
        expected_signature = (
            hashlib.md5(signature_base.encode("utf-8")).hexdigest().upper()
        )

        logger.info(f"Received signature: {signature_value}")
        logger.info(f"Expected signature: {expected_signature}")

        # Проверяем подпись
        if signature_value != expected_signature:
            logger.error(
                f"Invalid signature for purchase {inv_id}. Received: {signature_value}, Expected: {expected_signature}"
            )
            return HttpResponse("ERROR: Invalid signature", status=400)

        # Ищем покупку
        try:
            purchase = UserPurchase.objects.get(id=inv_id)

            # Проверяем сумму (в тестовом режиме могут быть целые числа, в боевом - с 6 знаками после точки)
            expected_amount = str(purchase.price_paid) if purchase.price_paid else "0"

            # Нормализуем суммы для сравнения (убираем лишние нули после точки)
            try:
                received_amount_normalized = str(float(out_sum))
                expected_amount_normalized = str(float(expected_amount))
            except ValueError:
                received_amount_normalized = out_sum
                expected_amount_normalized = expected_amount

            if received_amount_normalized != expected_amount_normalized:
                logger.warning(
                    f"Amount mismatch for purchase {inv_id}. Received: {received_amount_normalized}, Expected: {expected_amount_normalized}"
                )
                # В тестовом режиме можем пропустить, в боевом - нужно проверять строго
                if not settings.ROBOKASSA_TEST_MODE:
                    return HttpResponse("ERROR: Amount mismatch", status=400)

            # Обновляем статус покупки
            purchase.status = "paid"

            # Сохраняем дополнительную информацию о платеже
            payment_info = {
                "fee": fee,
                "email": email,
                "payment_method": payment_method,
                "currency": inc_curr_label,
                "shp_params": shp_params,
                "received_amount": out_sum,
                "processed_at": str(timezone.now()),
            }

            # Сохраняем информацию о платеже (можно добавить поле в модель или хранить в JSON)
            # purchase.payment_info = payment_info  # Если добавите поле payment_info в модель

            purchase.save()

            logger.info(f"Purchase {inv_id} successfully marked as paid")

            # Robokassa ожидает ответ в формате OK{InvId}
            return HttpResponse(f"OK{inv_id}", content_type="text/plain")

        except UserPurchase.DoesNotExist:
            logger.error(f"Purchase not found: {inv_id}")
            return HttpResponse("ERROR: Purchase not found", status=404)
        except Exception as e:
            logger.error(f"Error processing purchase {inv_id}: {str(e)}")
            return HttpResponse(f"ERROR: {str(e)}", status=500)

    except Exception as e:
        logger.error(f"Unexpected error in payment_result: {str(e)}")
        return HttpResponse("ERROR: Internal server error", status=500)


@api_view(["GET", "POST"])
def payment_success(request):
    """
    Обработка успешного платежа (SuccessURL)
    Пользователь возвращается после успешной оплаты
    """
    try:
        inv_id = request.GET.get("InvId") or request.POST.get("InvId")
        out_sum = request.GET.get("OutSum") or request.POST.get("OutSum")

        if not inv_id:
            return Response({"error": "Missing InvId parameter"}, status=400)

        try:
            purchase = UserPurchase.objects.get(id=inv_id)

            # Проверяем, что платеж действительно оплачен
            if purchase.status != "paid":
                return Response(
                    {
                        "success": False,
                        "message": "Платеж еще не подтвержден",
                        "purchase_id": str(purchase.id),
                        "status": purchase.status,
                    }
                )

            return Response(
                {
                    "success": True,
                    "purchase_id": str(purchase.id),
                    "menu_name": purchase.premium_meal_plan.name,
                    "amount": out_sum,
                    "status": purchase.status,
                }
            )

        except UserPurchase.DoesNotExist:
            return Response({"error": "Purchase not found"}, status=404)

    except Exception as e:
        logger.error(f"Error in payment_success: {str(e)}")
        return Response({"error": "Internal server error"}, status=500)


@api_view(["GET", "POST"])
def payment_fail(request):
    """
    Обработка неудачного платежа (FailURL)
    Пользователь возвращается после неудачной оплаты
    """
    try:
        inv_id = request.GET.get("InvId") or request.POST.get("InvId")

        if not inv_id:
            return Response({"error": "Missing InvId parameter"}, status=400)

        try:
            purchase = UserPurchase.objects.get(id=inv_id)

            # Обновляем статус только если еще не оплачен
            if purchase.status != "paid":
                purchase.status = "cancelled"
                purchase.save()

            return Response(
                {
                    "success": False,
                    "purchase_id": str(purchase.id),
                    "menu_name": purchase.premium_meal_plan.name,
                    "status": purchase.status,
                }
            )

        except UserPurchase.DoesNotExist:
            return Response({"error": "Purchase not found"}, status=404)

    except Exception as e:
        logger.error(f"Error in payment_fail: {str(e)}")
        return Response({"error": "Internal server error"}, status=500)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_payment(request):
    """
    Создание платежа в Robokassa
    """
    premium_meal_plan_id = request.data.get("premium_meal_plan_id")

    try:
        premium_meal_plan = PremiumMealPlan.objects.get(
            id=premium_meal_plan_id, is_active=True
        )
    except PremiumMealPlan.DoesNotExist:
        return Response({"error": "Меню не найдено"}, status=404)

    # Проверяем, не куплено ли уже меню
    if UserPurchase.objects.filter(
        user=request.user, premium_meal_plan=premium_meal_plan, status="paid"
    ).exists():
        return Response({"error": "Меню уже куплено"}, status=400)

    # Создаем или получаем существующую покупку
    purchase, created = UserPurchase.objects.get_or_create(
        user=request.user,
        premium_meal_plan=premium_meal_plan,
        defaults={"price_paid": premium_meal_plan.price, "status": "processing"},
    )

    # Если покупка уже существует, обновляем статус
    if not created:
        purchase.status = "processing"
        purchase.save()

    # Формируем параметры для Robokassa
    merchant_login = settings.ROBOKASSA_MERCHANT_LOGIN
    out_sum = str(purchase.price_paid) if purchase.price_paid else "0"

    # В тестовом режиме используем целые числа, в боевом - с 6 знаками после точки
    if not settings.ROBOKASSA_TEST_MODE:
        try:
            # Форматируем сумму с 6 знаками после точки
            out_sum = f"{float(out_sum):.6f}"
        except ValueError:
            pass

    inv_id = str(purchase.id)
    description = f"Оплата меню: {premium_meal_plan.name}"[
        :100
    ]  # Обрезаем до 100 символов
    culture = "ru"
    encoding = "utf-8"
    is_test = "1" if settings.ROBOKASSA_TEST_MODE else "0"

    # Добавляем пользовательские параметры (Shp_)
    shp_params = {
        "Shp_user": str(request.user.id),
        "Shp_menu": str(premium_meal_plan.id),
    }

    # Формируем подпись (SignatureValue) с пользовательскими параметрами
    signature_base = (
        f"{merchant_login}:{out_sum}:{inv_id}:{settings.ROBOKASSA_PASSWORD1}"
    )

    # Добавляем пользовательские параметры в алфавитном порядке
    sorted_shp_params = sorted(shp_params.items())
    for key, value in sorted_shp_params:
        signature_base += f":{key}={value}"

    signature_value = hashlib.md5(signature_base.encode(encoding)).hexdigest().lower()

    # Дополнительные параметры для улучшенного интерфейса
    settings_param = {"PaymentMethods": ["BankCard", "SBP"], "Mode": "modal"}

    # Формируем полный набор параметров для Robokassa
    payment_params = {
        "MerchantLogin": merchant_login,
        "OutSum": out_sum,
        "InvId": inv_id,
        "Description": description,
        "Culture": culture,
        "Encoding": encoding,
        "IsTest": is_test,
        "SignatureValue": signature_value,
        "Settings": json.dumps(settings_param),
        "Shp_user": str(request.user.id),
        "Shp_menu": str(premium_meal_plan.id),
    }

    # Добавляем пользовательские параметры
    payment_params.update(shp_params)

    return Response(
        {
            "payment_params": payment_params,
            "purchase_id": str(purchase.id),
            "menu_name": premium_meal_plan.name,
        }
    )
