export function passwordResetEmailHtml(params: {
  resetUrl: string;
  locale: 'en' | 'ar';
}): string {
  if (params.locale === 'ar') {
    return `
      <div dir="rtl" style="font-family: Zain, sans-serif; line-height:1.6">
        <h1>إعادة تعيين كلمة المرور — نبتة</h1>
        <p>اضغط الرابط أدناه لإعادة تعيين كلمة المرور. ينتهي الرابط خلال ساعة.</p>
        <p><a href="${params.resetUrl}">${params.resetUrl}</a></p>
        <p>إذا لم تطلب ذلك، تجاهل هذه الرسالة.</p>
      </div>`;
  }
  return `
    <div style="font-family: Quicksand, sans-serif; line-height:1.6">
      <h1>Reset your Nabta password</h1>
      <p>Click the link below to choose a new password. This link expires in one hour.</p>
      <p><a href="${params.resetUrl}">${params.resetUrl}</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>`;
}
