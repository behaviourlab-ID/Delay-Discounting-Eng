console.log("experiment.js is running!");

// ============ 1) Helper Functions ============

function rnorm(mean = 0, stdev = 1) {
  let u1, u2, v1, v2, s;
  if (rnorm.v2 === null) {
    do {
      u1 = Math.random();
      u2 = Math.random();
      v1 = 2 * u1 - 1;
      v2 = 2 * u2 - 1;
      s = v1 * v1 + v2 * v2;
    } while (s === 0 || s >= 1);
    rnorm.v2 = v2 * Math.sqrt(-2 * Math.log(s) / s);
    return stdev * v1 * Math.sqrt(-2 * Math.log(s) / s) + mean;
  }
  v2 = rnorm.v2;
  rnorm.v2 = null;
  return stdev * v2 + mean;
}
rnorm.v2 = null;

function fillArray(value, len) {
  let arr = [];
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < value.length; j++) {
      arr.push(value[j]);
    }
  }
  return arr;
}

function randomDraw(lst) {
  let index = Math.floor(Math.random() * lst.length);
  return lst[index];
}

// Evaluate or record performance at end
function assessPerformance() {
  let exp_data = jsPsych.data.get().filter({ trial_id: "stim" }).values();
  let missed_count = 0;
  let trial_count = 0;
  let rt_array = [];

  for (let d of exp_data) {
    trial_count++;
    if (d.rt == null) missed_count++;
    else rt_array.push(d.rt);
  }

  rt_array.sort((a, b) => a - b);
  let avg_rt = -1;
  if (rt_array.length > 0) {
    let mid = Math.floor(rt_array.length / 2);
    if (rt_array.length % 2 === 1) {
      avg_rt = rt_array[mid];
    } else {
      avg_rt = (rt_array[mid - 1] + rt_array[mid]) / 2;
    }
  }

  let missed_percent = missed_count / trial_count;
  let credit_var = (missed_percent < 0.4 && avg_rt > 200);

  let bonus = randomDraw(bonus_list);
  jsPsych.data.addProperties({
    credit_var: credit_var,
    bonus_var: bonus
  });
}

// ============ 2) Global Variables ============
let bonus_list = [];

// Generate 20 random smaller amounts (rounded to 2 decimals)
let small_amts = [];
for (let i = 0; i < 20; i++) {
  let val = Math.round(rnorm(20, 10) * 100) / 100;
  if (val < 50) val = 50;
  if (val > 400) val = 400;
  small_amts.push(val);
}
let rel_dif = fillArray([1.01, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30, 1.50, 1.75], 4);
let larger_amts = [];
for (let i = 0; i < 20; i++) {
  let val = Math.round(small_amts[i] * rel_dif[i] * 100) / 100;
  larger_amts.push(val);
}

// Delays
let sooner_dels = fillArray(["today"], 18).concat(fillArray(["in 2 weeks"], 18));
let later_dels = fillArray(["in 2 weeks"], 9)
  .concat(fillArray(["in 4 weeks"], 18))
  .concat(fillArray(["in 6 weeks"], 9));

// Build 20 test trials (store amounts as numbers; formatting happens later)
let trials = [];
for (let i = 0; i < 20; i++) {
  trials.push({
    trial_id: "stim",
    smaller_amount: small_amts[i],
    sooner_delay: sooner_dels[i],
    larger_amount: larger_amts[i],
    later_delay: later_dels[i]
  });
}

// ============ 3) Initialize jsPsych ============
const jsPsych = initJsPsych({
  on_finish: () => {
    console.log("Experiment finished.");
  }
});

// 3b) Read URL parameter and attach auto-generated ID (if applicable)
const urlParams = new URLSearchParams(window.location.search);
const participantId = urlParams.get('participant_id'); 
jsPsych.data.addProperties({
  participant_id: participantId
});

// ============ 4) Build Trials ============

// 4A) Introduction (single button)
let intro_text = `
  Welcome to the experiment. This task will take around 5 minutes.
  Click "Start" to begin.
`;
let intro_block = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div id="container">
      <p class="center-block-text">${intro_text}</p>
    </div>
  `,
  choices: ["Start"],
  data: { trial_id: "intro" }
};

// 4B) Instructions (multi-page with buttons)
let instructions_block = {
  type: jsPsychInstructions,
  pages: [
    `<div id="container">
       <p class="center-block-text">
         In this experiment, you will be presented with two amounts of money to choose between. These amounts will be available at different time points. .
         Your job is to indicate which option you would prefer by clicking on the option you prefer.
       </p>
       <p class="center-block-text">
         Please indicate your <strong>true</strong> preference.
       </p>
     </div>`
  ],
  button_label_next: "Next",
  show_clickable_nav: true,
  data: { trial_id: "instructions" }
};

// 4C) Practice trial with clickable options (no extra buttons)
let practice_trial = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div id="container">
      <p class="center-block-text">Here is a sample trial: Please select the option that you would prefer:</p>
      <div class="table">
        <div class="row">
          <!-- Note: using class "option" with data-choice attribute -->
          <div class="option" data-choice="0">
            <center><font color='green'>$${20.58}<br>today</font></center>
          </div>
          <div class="option" data-choice="1">
            <center><font color='green'>$${25.93}<br>in two weeks</font></center>
          </div>
        </div>
      </div>
    </div>
  `,
  choices: [], // no default buttons
  data: {
    trial_id: "stim",
    exp_stage: "practice",
    smaller_amount: 20.58,
    sooner_delay: "today",
    larger_amount: 25.93,
    later_delay: "in 2 weeks"
  },
  on_load: function() {
    // Attach click event listeners to the option divs
    document.querySelectorAll('.option').forEach(function(el) {
      el.addEventListener("click", function() {
        let response = parseInt(el.getAttribute("data-choice"));
        jsPsych.finishTrial({ response: response });
      });
    });
  },
  on_finish: function(data) {
    if (data.response === 0) {
      data.choice = "smaller_sooner";
    } else if (data.response === 1) {
      data.choice = "larger_later";
    }
  }
};

// 4D) Comprehension Check
let comprehension_block = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div id="container">
      <p class="center-block-text">You are now ready to begin the survey</p>
      <p class="center-block-text">Klick the button to begin</p>
    </div>
  `,
  choices: ["Begin"],
  data: { trial_id: "comprehension_check" }
};

// 4E) Main test block – 20 trials with random amounts and delays
let main_test_block = {
  timeline: trials.map((t, i) => {
    let small_str = t.smaller_amount.toFixed(2);
    let large_str = t.larger_amount.toFixed(2);
    return {
      type: jsPsychHtmlButtonResponse,
      stimulus: `
        <div id="container">
          <p class="center-block-text">Which option you prefer:</p>
          <div class="table">
            <div class="row">
              <!-- Clickable options with data-choice attribute -->
              <div class="option" data-choice="0">
                <center><font color='green'>$${small_str}<br>${t.sooner_delay}</font></center>
              </div>
              <div class="option" data-choice="1">
                <center><font color='green'>$${large_str}<br>${t.later_delay}</font></center>
              </div>
            </div>
          </div>
        </div>
      `,
      choices: [],
      data: {
        trial_id: "stim",
        smaller_amount: t.smaller_amount,
        sooner_delay: t.sooner_delay,
        larger_amount: t.larger_amount,
        later_delay: t.later_delay
      },
      on_load: function() {
        // Attach click event listeners to the option divs
        document.querySelectorAll('.option').forEach(function(el) {
          el.addEventListener("click", function() {
            let response = parseInt(el.getAttribute("data-choice"));
            jsPsych.finishTrial({ response: response });
          });
        });
      },
      on_finish: function(d) {
        let choice = "";
        let chosen_amount = 0;
        let chosen_delay = "";
        if (d.response === 0) {
          choice = "smaller_sooner";
          chosen_amount = d.smaller_amount;
          chosen_delay = d.sooner_delay;
        } else if (d.response === 1) {
          choice = "larger_later";
          chosen_amount = d.larger_amount;
          chosen_delay = d.later_delay;
        }
        d.choice = choice;
        d.chosen_amount = chosen_amount;
        d.chosen_delay = chosen_delay;
        bonus_list.push({ amount: chosen_amount, delay: chosen_delay });
      }
    };
  }),
  randomize_order: true
};

// 4F) Post-task survey REMOVED

// 4G) End block (single button)
let end_block = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div id="container">
      <p class="center-block-text">Thank you for participating in this experiment!</p>
      <p class="center-block-text">Click "Finish" to finish the experiment.</p>
    </div>
  `,
  choices: ["Finish"],
  data: { trial_id: "end" },
  on_finish: function() {
    assessPerformance();
    let experimentData = jsPsych.data.get().json();
    fetch("https://script.google.com/macros/s/AKfycbwJ3kN7VhhX7ToYg531mgGGTRg3yffWmSH5J7AZVXEITIAxiiCjCEM2nSjskNSWs0DR6g/exec", {
      method: "POST",
      mode: "no-cors", // bypass CORS checks if needed
      body: experimentData,
      headers: { "Content-Type": "application/json" }
    })
    .then(response => {
      console.log("Data successfully sent (no-cors)!");
    })
    .catch(error => {
      console.error("Error sending data:", error);
    });
  }
};

// 4H) Final Instruction Block (additional page)
let final_instruction_block = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div id="container">
      <p class="center-block-text">
        This part is finished. <br>
        Please click the blue arrow button on the bottom right.
      </p>
    </div>
  `,
  choices: [],
  data: { trial_id: "final_instruction" }
};

// ============ 5) Build Timeline & Run ============
let timeline = [];
timeline.push(intro_block);
timeline.push(instructions_block);
timeline.push(practice_trial);
timeline.push(comprehension_block);
timeline.push(main_test_block);
// Removed the post-task survey block from the timeline
timeline.push(end_block);
timeline.push(final_instruction_block);

jsPsych.run(timeline);
