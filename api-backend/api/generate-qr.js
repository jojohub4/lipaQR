import axios from 'axios/dist/node/axios.cjs';

export default async function handler(req, res) {
  const {
    transactionType,
    amount,
    merchantName,
    tillNumber,
    paybillNumber,
    accountRef,
    phoneNumber,
  } = req.body;

  const consumerKey = process.env.SAFARICOM_KEY;
  const consumerSecret = process.env.SAFARICOM_SECRET;

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  console.log("🔁 Incoming Request:", {
    transactionType,
    merchantName,
    amount,
    tillNumber,
    paybillNumber,
    accountRef,
    phoneNumber
  });

  try {
    const tokenRes = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const accessToken = tokenRes.data.access_token;
    console.log("✅ Access token received");

    let merchantCode = '';
    if (transactionType === 'Buy Goods') merchantCode = tillNumber;
    else if (transactionType === 'PayBill') merchantCode = paybillNumber;
    else merchantCode = phoneNumber;

    if (!merchantCode || !merchantName) {
      return res.status(400).json({ error: "Missing required fields (merchantName, merchantCode)" });
    }

    const payload = {
      merchantName,
      amount: amount && amount.trim() !== '' ? parseFloat(amount) : null,
      merchantCode,
      merchantTransactionType:
        transactionType === 'Buy Goods'
          ? 'BG'
          : transactionType === 'PayBill'
          ? 'PB'
          : transactionType === 'Send to Pochi'
          ? 'MMF'
          : 'SM',
      reference: transactionType === 'PayBill' ? accountRef : '',
    };

    console.log("📤 Sending QR payload to Safaricom:", payload);

    const qrRes = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/qrcode/v1/generate',
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log("✅ QR Code generated successfully");

    res.status(200).json(qrRes.data);
  } catch (error) {
    console.error('❌ QR ERROR:', error.response?.data || error.message || error);
    res.status(500).json({
      error: 'Failed to generate QR code',
      details: error.response?.data || error.message,
    });
  }
}
