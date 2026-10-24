// يسمح لك بفتح الرابط من المتصفح مباشرة للتأكد من أن الـ API تعمل بنجاح
export async function onRequestGet() {
  return new Response(JSON.stringify({
    success: true,
    message: "Cloudflare Functions API تعمل بنجاح!"
  }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { code, deviceId } = body;

    if (!code || !deviceId) {
      return new Response(JSON.stringify({ success: false, message: 'بيانات غير مكتملة.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // نحذف toUpperCase() حتى يطابق الكود المسجل في KV تماماً
    const cleanCode = code.trim();

    // 1. البحث عن الكود داخل قاعدة بيانات KV
    const licenseRaw = await env.LICENSES.get(cleanCode);

    if (!licenseRaw) {
      return new Response(JSON.stringify({ success: false, message: 'كود الترخيص غير صالح أو غير موجود.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const license = JSON.parse(licenseRaw);

    // 2. إذا كان الكود غير مستخدم بعد -> ربطه بالجهاز فوراً
    if (license.status === 'unused') {
      license.status = 'used';
      license.deviceId = deviceId;
      license.firstUsedAt = new Date().toISOString();

      // حفظ التعديل في KV
      await env.LICENSES.put(cleanCode, JSON.stringify(license));

      return new Response(JSON.stringify({
        success: true,
        message: 'تم تفعيل الكود بنجاح وربطه بجهازك.',
        downloadUrl: 'https://youtu.be/aWrwj8QXTXE?si=W0MJXF2n-1rj-PkN'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. إذا كان الكود مستخدماً من نفس الجهاز
    if (license.status === 'used' && license.deviceId === deviceId) {
      return new Response(JSON.stringify({
        success: true,
        message: 'تم التحقق من الترخيص الخاص بجهازك.',
        downloadUrl: 'https://youtu.be/aWrwj8QXTXE?si=W0MJXF2n-1rj-PkN'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. محاولة استخدام الكود من جهاز ثانٍ
    return new Response(JSON.stringify({
      success: false,
      message: 'هذا الكود مستخدم مسبقاً على جهاز آخر. التراخيص مخصصة لجهاز واحد فقط.'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: 'حدث خطأ في الخادم.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}