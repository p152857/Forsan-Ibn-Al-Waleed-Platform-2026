مشروع منصة فرسان ابن الوليد مع صفحة لوحة إنجاز مستقلة

الملفات المهمة:
- index.html: صفحة الاختبار.
- leaderboard.html: صفحة مستقلة لعرض قوائم الإنجاز لأولياء الأمور والطلاب.
- config.js: ضع فيه رابط Google Apps Script.
- students.json: بيانات الطلاب ورموز الدخول المشفرة.
- apps_script_لوحة_الإنجاز.gs: كود Google Apps Script.

خطوات التفعيل:
1) أنشئ Google Sheet جديداً باسم مثلاً: نتائج منصة فرسان ابن الوليد.
2) من Google Sheet اختر Extensions ثم Apps Script.
3) الصق محتوى ملف apps_script_لوحة_الإنجاز.gs.
4) اضغط Deploy ثم New deployment ثم اختر Web app.
5) اجعل Execute as = Me.
6) اجعل Who has access = Anyone.
7) انسخ رابط Web app.
8) افتح config.js وضع الرابط مكان:
   https://script.google.com/macros/s/AKfycby48se76qnbCcW-k91aX1ek4H3J8ibcAc8PlN93aWtigL-9Mbvy8AtyWbE3okk4W5Hr/exec
9) ارفع ملفات المشروع إلى GitHub.
10) فعّل GitHub Pages.
11) رابط الاختبار سيكون index.html، ورابط لوحة الإنجاز سيكون leaderboard.html.

ملاحظة:
الأزرار الإدارية مثل مسح سجل النتائج وتصفير لوحة الإنجاز أصبحت داخل دخول المعلم وتحتاج رمز المعلم الموجود في config.js.
غيّر TEACHER_CODE في config.js إلى رمز لا يعرفه الطلاب.

تحديث إدارة الطلاب:
- تم تغيير مسمى الدخول إلى: دخول المسؤول.
- رمز دخول المسؤول: Rayan9892026@@@
- تمت إضافة لوحة إدارة الطلاب لإضافة طالب جديد، تعديل بيانات الطالب، وتعطيل الطالب فقط دون حذف نتائجه السابقة.
- بعد تحديث كود Apps Script المرفق يجب إعادة نشر تطبيق الويب بإصدار جديد.
- عند أول استخدام، ادخل من زر دخول المسؤول ثم اضغط: استيراد القائمة الحالية إلى Google Sheets، حتى تنتقل قائمة students.json إلى ورقة Students.
