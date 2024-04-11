**Прект русской локализации "ComfyUI"**

> Russian localization fork project "ComfyUI"

> 俄罗斯本地化分叉项目“ComfyUI”

---
Локализация **"ComfyUI"** производится без какого-либо вмешательства в код самой **"ComfyUI"**, путем "перехвата строк на лету" и замены определенных, английских "буквосочетаний" на их русские аналоги.
Установка и удаление этого модуля локализации никак не влияет на работоспособность саммой **"ComfyUI"** и любых компонентов установленных в системе!

Локализатор устанавливается как обычная кастом-нода через "ComfyUI-Manager" - **"Install via Git URL"** и ввода git-адреса:

- **https://github.com/Nestorchik/NStor-ComfyUI-Translation.git**
<p align="center">
  <img src="img/3.jpg">
</p>
... или просто путем копирования папки с нодой в каталог "custom_nodes". Установка пакетов питона не требуется.
 
---
Модуль начинает работу сразу после перезагрузки питона.

---

Для "нормальной работы с локализованной версией "ComfyUI" требуется установленный "ComfyUI-Manager". В его меню (шестеренка) - пункт **"AGLTranslation-langualge"** выбрать язык **"Русский"**.
<p align="center">
  <img src="img/1.jpg">
</br>
  <img src="img/2.jpg">
</p>
Переключение языка "Русский/Английский" кнопкой менеджера "Switch Locale/Смена языка".

---

Проект содержить только русский (и английский) языки, все остальные языки отключены.

На fork "AIGODLIKE" "ru-RU" берется отсюда, берут сами.

Здесь всегда последние обновления русской локализации для "ComfyUI", публикую почти онлайн.

Обновление в ComfyUI (пока!) вручную, папка "custom_nodes\NStor-ComfyUI-Translation\" и, в режиме терминала -> "git pull".

Для обновления через ComfyUI-менеджера надо еще пройти регистрацию в их БД, а это - время.

Проект только открылся, рассчет времени жизни поекта - простоянный, долгосрочный.

Все замечания, предложения в [Telegram](https://t.me/stable_cascade_rus/1282)
