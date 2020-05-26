require('dotenv').config(); // For testing

const axios = require('axios');
const format = require('date-fns/format');
const util = require('util');
const supermarkets = require('../supermarkets');

const formatSlotData = (slots, numOfSlotsToFormat) => {
  const formattedSlots = [];

  for (let i = 0; i < numOfSlotsToFormat; i++) {
    const formattedSlot = {};

    // If either of you can think of a nicer way to do this, let me know. I
    // don't like the aesthetic.
    formattedSlot.formattedDate = format(slots[i].start, 'EEEE, do LLLL');
    formattedSlot.startTime = format(slots[i].start, 'k:mm');
    formattedSlot.endTime = format(slots[i].end, 'k:mm');
    if (slots[i].price) formattedSlot.price = slots[i].price; // TODO: Test this.

    formattedSlots.push(formattedSlot);
  }
  return formattedSlots;
}

const buildSgPersonalization = (merchant, slots, address, url) => {
  const maxSlotsPerEmail = 5; 
  const numOfSlotsToFormat = slots.length > maxSlotsPerEmail ? maxSlotsPerEmail : slots.length;
  const dynamicTemplateData = {
    'btn-link': url,
    more: slots.length > maxSlotsPerEmail ? true : false,
    merchant: supermarkets[merchant],
    slots: formatSlotData(slots, numOfSlotsToFormat)
  };
  const personalization = {
    to: [{ email: address }],
    dynamic_template_data: dynamicTemplateData
  };
  // console.log('personalization is:', personalization);
  return personalization;
};

const buildSgPayload = (merchant, slots, addresses, url) => {
  const sgPayload = {
    from: { email: 'noreply@findadelivery.com' },
    template_id:'d-ae627fe97d3c43209c1608fb43dfe7f0',
    personalizations: addresses.map((address) => buildSgPersonalization(merchant, slots, address, url)) // SendGrid only lets you create 1000 of these per email
  };
  // console.log('sgPayload is:', sgPayload);
  return sgPayload;
}

const defineAddresses = (addresses) => {
  const primaryAddress = process.env.PERSONAL_EMAIL;

  if (!primaryAddress && !addresses) throw { statusCode: 400, message: 'No recipient(s) found.' };
  if (!primaryAddress) {
    return addresses;
  } else if (!addresses) {
    return [primaryAddress];
  } else {
    return [primaryAddress, ...addresses];
  }
};

const sendEmail = async (data) => {
  // TODO: Build logger for debugging/testing
  try {
    if (!data) throw { statusCode: 400, message: 'No data passed.' };

    console.log('Checking parameters...');
    const requiredArgs = ['merchant', 'slots', 'url'];
    requiredArgs.forEach((arg) => {
      // console.log(`Checking data[${arg}] contains data...`);
      if (data[arg] === undefined || data[arg] === null) throw { statusCode: 400, message: 'Required argument missing: ' + arg }
    });

    console.log('Finished checking parameters.');
    const { merchant, slots, url } = data;
    console.log('Looking for addresses...');
    const addresses = defineAddresses(data.addresses);
    console.log('Addresses found:', addresses);

    // TODO: Extract the "build" function into a separate function
    const sgPayload = buildSgPayload(merchant, slots, addresses, url);
    await axios({
      method: 'post',
      url: 'https://api.sendgrid.com/v3/mail/send',
      data: JSON.stringify(sgPayload),
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
    });

    console.log('Successfully called SendGrid.');
    return { statusCode: 200, message: 'Successfully called SendGrid.' };
  } catch (error) {
    console.log('Error is:', JSON.stringify(error.message));
    return error;
  }
};

module.exports = {
  send: sendEmail,
  build: buildSgPayload
};
