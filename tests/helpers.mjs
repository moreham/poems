export async function mailCode(base, email) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const list = await (await fetch(`${base}/api/v1/messages`)).json();
    const message = list.messages?.find(item => item.To?.some(to => to.Address.toLowerCase() === email.toLowerCase()));
    if (message) {
      const details = await (await fetch(`${base}/api/v1/message/${message.ID}`)).json();
      const code = details.Text?.match(/\b\d{6}\b/)?.[0];
      if (code) return code;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('测试邮箱未收到验证码');
}
