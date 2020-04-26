const axios = require("axios");
let availabilityVerified = false;

const checkAsda = (postcode) => {
  console.log('running asda');
  axios
    .post("https://groceries.asda.com/api/v3/slot/view", {
      requestorigin: "gi",
      data: {
        service_info: {
          fulfillment_type: "DELIVERY",
          enable_express: false,
        },
        start_date: "2020-04-25T00:00:00+01:00",
        end_date: "2020-05-15T00:00:00+01:00",
        reserved_slot_id: "",
        service_address: {
          postcode,
        },
        customer_info: {
          account_id: "8774316050",
        },
        order_info: {
          order_id: "20027220446",
          restricted_item_types: [],
          volume: 0,
          weight: 0,
          sub_total_amount: 0,
          line_item_count: 0,
          total_quantity: 0,
        },
      },
    })
    .then((res) => {
      console.log(`statusCode: ${res.status_code}`);
      getSlots(res.data.data);
    })
    .catch((error) => {
      console.error(error);
    });
};

const getSlots = (data) => {
  if (data.slot_days) {
    // console.log(data.slot_days);
    data.slot_days.forEach((day) => {
      day.slots.forEach((slot) => {
        if (slot.slot_info.status === "UNAVAILABLE") {
          console.log(slot.slot_info.status);
           availabilityVerified = true;

          // there is a slot open on date:
          const startTime = new Date(slot.slot_info.start_time);
          const endTime = new Date(slot.slot_info.end_time);
          console.log("date", `${startTime.toDateString()}`);
          console.log(
            "start time",
            `${startTime.getUTCHours()}:${startTime.getUTCMinutes()}0`
          );
          console.log(
            "start time",
            `${endTime.getUTCHours()}:${endTime.getUTCMinutes()}0`
          );
        }
      });
    });
  }
};

const asdaAvailabilityStatus = () => {
  return availabilityVerified;
};

module.exports = {
  checkAsda,
  asdaAvailabilityStatus
}