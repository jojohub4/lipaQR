import axios from 'axios/dist/node/axios.cjs';

export default async function handler(req, res) {
  const {
    transactionType,
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

    const sanitizedMerchantName = merchantName.trim();
    const sanitizedPhone = phoneNumber.startsWith('+254')
      ? phoneNumber
      : phoneNumber.replace(/^0/, '+254');

    const isPayBill = transactionType === 'PayBill';
    const isBuyGoods = transactionType === 'Buy Goods';
    const isMMF = transactionType === 'Send to Pochi';
    const isSM = transactionType === 'Send Money';

    const merchantCode = isBuyGoods
      ? tillNumber
      : isPayBill
        ? paybillNumber
        : sanitizedPhone;

    if (!merchantCode || !merchantName) {
      return res.status(400).json({ error: "Missing required fields (merchantName, merchantCode)" });
    }

    const payload = {
      merchantName: sanitizedMerchantName,
      merchantCode: isBuyGoods
        ? tillNumber
        : isPayBill
          ? paybillNumber
          : sanitizedPhone,
      merchantTransactionType: isBuyGoods
        ? 'BG'
        : isPayBill
          ? 'PB'
          : isMMF
            ? 'MMF'
            : 'SM',
      reference: isPayBill ? accountRef : '',
      amount: "10.00", // Fixed amount 
      size: "300", // QR code size in pixels
      trxCode: isBuyGoods
        ? 'BG'
        : isPayBill
          ? 'PB'
          : isMMF
            ? 'MMF'
            : 'SM', // Must match merchantTransactionType
      CPI: isBuyGoods
        ? tillNumber
        : isPayBill
          ? paybillNumber
          : sanitizedPhone // Merchant identifier
    };


    console.log("📤 Sending QR payload to Safaricom:", payload);

    // Step 3: Send to QR API
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
};
