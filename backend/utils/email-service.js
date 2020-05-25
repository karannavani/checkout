require('dotenv').config(); // For testing
const axios = require('axios');
const format = require('date-fns/format');
const util = require('util');
const supermarkets = require('../supermarkets');

const formatSlotData = (slots, maxSlotsAllowed) => {
  const formattedSlots = [];

  for (let i = 0; i < maxSlotsAllowed; i++) {
    const formattedSlot = {};

    formattedSlot.formattedDate = format(slots[i].start, 'EEEE, do LLLL');
    formattedSlot.startTime = format(slots[i].start, 'k:mm');
    formattedSlot.endTime = format(slots[i].end, 'k:mm');
    if (slots[i].price) formattedSlot.price = slots[i].price; // TODO: Test this.

    formattedSlots.push(formattedSlot);
  }

  return formattedSlots;
}

const buildSgPersonalisation = (merchant, slots, address, url) => {
  const maxSlotsAllowed = slots.length > 5 ? 5 : slots.length;
  const dynamicTemplateData = {
    'btn-link': url,
    more: slots.length > maxSlotsAllowed ? true : false,
    merchant: supermarkets[merchant],
    slots: formatSlotData(slots, maxSlotsAllowed)
  };

  return {
    to: [{ email: address }],
    dynamic_template_data: dynamicTemplateData
  };
};

const buildSgPayload = (merchant, slots, addresses, url) => {
  const personalizations = addresses.map((address) => buildSgPersonalisation(merchant, slots, address, url));
  const sgPayload = {
    from: { email: 'noreply@findadelivery.com' },
    template_id:'d-ae627fe97d3c43209c1608fb43dfe7f0',
    personalizations
  };

  return sgPayload;
}

const defineAddresses = (addresses) => {
  console.log('Looking for addresses...');

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
  const url = 'https://api.sendgrid.com/v3/mail/send';

  try {
    if (!data) throw { statusCode: 400, message: 'No data passed.' };
    // TODO: Let's quit immediately if we can't find a valid API key. It's fine for
    // now but is a good check to have in place.
    // if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // else throw { statusCode: 400, message: 'No API key found.' };

    console.log('Checking parameters are valid...');

    const requiredArgs = ['merchant', 'slots', 'url'];
    requiredArgs.forEach((arg) => {
      // TODO: Check a supported merchant has been submitted
      // TODO: Build logger for debugging/testing
      // console.log(`Checking data[${arg}] contains data...`);
      if (data[arg] === undefined || data[arg] === null) throw { statusCode: 400, message: 'Required argument missing: ' + arg }
    });

    const { merchant, slots, url } = data;

    console.log('Finished checking parameters.');
    const addresses = defineAddresses(data.addresses);
    console.log('Addresses found:', addresses);

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
  build: buildSgPayload // TODO: Find a way to test this without exposing it.
}

// const addMinutes = require('date-fns/addMinutes');
// const now = new Date;
// const slots = [ // 9 slots here.
//   { date: now, start: now, end: addMinutes(now, 30), price: '£1.50' },
//   { date: now, start: addMinutes(now, 60), end: addMinutes(now, 90), price: '£1.50' }, // An hour after the previous slot
//   { date: now, start: addMinutes(now, 60), end: addMinutes(now, 90), price: '£1.50' },
//   { date: now, start: addMinutes(now, 60), end: addMinutes(now, 90), price: '£1.50' },
//   { date: now, start: addMinutes(now, 60), end: addMinutes(now, 90), price: '£1.50' },
//   { date: now, start: addMinutes(now, 60), end: addMinutes(now, 90), price: '£1.50' },
//   { date: now, start: addMinutes(now, 60), end: addMinutes(now, 90), price: '£1.50' },
//   { date: now, start: addMinutes(now, 60), end: addMinutes(now, 90), price: '£1.50' },
//   { date: now, start: addMinutes(now, 60), end: addMinutes(now, 90), price: '£1.50' }
// ];
// sendEmail({ merchant: 'asda', slots, url: 'https://kanelincoln.com', addresses: ['iamkarannavani@gmail.com', 'curtis.burns28@gmail.com'] });
