async function testSDXL() {
  const body = {
    text_prompts: [{ text: 'improve this image' }],
    cfg_scale: 5,
    steps: 30,
    init_image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
  };
  const res = await fetch('https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-xl', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  });
  console.log(res.status);
  console.log(await res.text());
}
testSDXL();
