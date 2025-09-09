const fastify = require('fastify')();
const axios = require('axios');

fastify.register(require('@fastify/cors'), {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

fastify.post('/calculate-hash', async (request, reply) => {
  const { transactionHash } = request.body;
  if (!transactionHash) {
    reply.status(400).send({ error: 'Missing transactionHash in request body' });
    return;
  }
  try {
    const response = await axios.post(
      'https://www.qupaca.com/api/calculate-hash',
      { transactionHash },
      {
        headers: {
          accept: '*/*',
          'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8,fr;q=0.7',
          'cache-control': 'no-cache',
          'content-type': 'application/json',
          origin: 'https://www.qupaca.com',
          pragma: 'no-cache',
          priority: 'u=1, i',
          referer: 'https://www.qupaca.com/slots',
          'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
        }
      }
    );
    reply.send(response.data);
  } catch (err) {
    reply.status(500).send({ error: err?.response?.data?.error || err.message });
  }
});

fastify.post('/rpc', async (request, reply) => {
  const rpcUrl = "https://api.roninchain.com/rpc";
  if (!rpcUrl) {
    reply.status(500).send({ error: 'RPC_URL is not configured' });
    return;
  }
  try {
    const headers = {
      accept: '*/*',
      'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8,fr;q=0.7',
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      origin: 'https://www.qupaca.com',
      pragma: 'no-cache',
      priority: 'u=1, i',
      referer: 'https://www.qupaca.com/lottery',
      'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
    };
    const response = await axios.post(rpcUrl, request.body, { headers });
    reply.send(response.data);
  } catch (err) {
    const status = err?.response?.status || 500;
    const data = err?.response?.data || { error: err.message };
    reply.status(status).send(data);
  }
});

fastify.listen({ port: 3500 }, (err, address) => {
  if (err) {
    process.exit(1);
  }
});
