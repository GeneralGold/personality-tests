// Load JSON data
const urlParams = new URLSearchParams(window.location.search);
const quizName = urlParams.get("quiz"); // Get the quiz name from the URL
const quizFile = `./quiz/${quizName}.json`; // Path to the quiz JSON

// Variables
let currentQuestionIndex = -1; // Start with the landing page
let userAnswers = [];
const scores = {}; // Keep track of scores for each result
let quizData = null;

// Fetch quiz data
fetch(quizFile)
  .then((response) => {
    if (!response.ok) {
      console.error("Failed to load quiz data:", response.statusText);
      alert("Failed to load quiz data.");
      return;
    }
    return response.json();
  })
  .then((data) => {
    quizData = data;

    // Set the title dynamically from the JSON file
    document.title = data.title || "Quiz";

    // Initialize results scores
    for (const result in data.results) {
      scores[result] = 0;
    }

    // Render the landing page
    renderLandingPage(data);
  })
  .catch((error) => {
    console.error("Error loading quiz data:", error);
    alert("Failed to load quiz data.");
  });

// Render the landing page
function renderLandingPage(data) {
  const questionContainer = document.getElementById("question-container");

  // Use the landingImage directly from the JSON without adding './images/'
  const landingImagePath = data.landingImage;

  questionContainer.innerHTML = `
    <div id="landing-page">
      <h1>${data.title}</h1>
      ${data.description ? `<p>${data.description}</p>` : ""}
      ${
        landingImagePath
          ? `<img src="${landingImagePath}" alt="Quiz Image" style="max-width: 80%; height: auto; margin: 10px auto; display: block;">`
          : ""
      }
      <button id="start-btn">Start Quiz</button>
    </div>
  `;

  document.getElementById("start-btn").addEventListener("click", () => {
    renderQuestion();
  });
}


// Render the current question
function renderQuestion() {
  const data = quizData;
  currentQuestionIndex++;

  const question = data.questions[currentQuestionIndex];
  const questionContainer = document.getElementById("question-container");

  if (!question) {
    renderResult();
    return;
  }

  // Render question text and image (if available)
  questionContainer.innerHTML = `
    <h2>${question.text}</h2>
    ${
      question.image
        ? `<img src="${question.image}" alt="Question Image" style="max-width: 80%; height: auto; margin: 10px 0;">`
        : ""
    }
    <div id="answer-container">
      ${
        question.type === "multiple-choice"
          ? question.options
              .map(
                (option, index) => `
        <label>
          <input type="radio" name="answer" value="${index}" />
          ${option.text}
        </label><br/>
      `
              )
              .join("")
          : question.type === "slider"
          ? `
        <input type="range" id="slider" min="${question.min}" max="${question.max}" step="${question.step}" />
        <p id="slider-value">${question.min}</p>
        <p>${question.description || ""}</p>
      `
          : question.type === "rank"
          ? `
        <ul id="sortable">
          ${question.options
            .map(
              (option) => `
            <li class="sortable-item" data-value="${option.text}">${option.text}</li>
          `
            )
            .join("")}
        </ul>
      `
          : ""
      }
    </div>
  `;

  // Add slider functionality
  if (question.type === "slider") {
    const slider = document.getElementById("slider");
    const sliderValue = document.getElementById("slider-value");
    slider.value = question.min; // Start at minimum value
    slider.addEventListener("input", (event) => {
      sliderValue.textContent = event.target.value;
    });
  }

  // Add sortable functionality for rank questions
  if (question.type === "rank") {
    const sortable = document.getElementById("sortable");
    new Sortable(sortable, {
      animation: 150,
      onEnd: () => {
        // Update the order of items after drag
        saveAnswer(); // Save the answer when ranking is done
      },
    });
  }

  // Update button visibility
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const submitBtn = document.getElementById("submit-btn");

  prevBtn.style.display = currentQuestionIndex === 0 ? "none" : "inline-block";
  nextBtn.style.display = currentQuestionIndex < data.questions.length - 1 ? "inline-block" : "none";
  submitBtn.style.display = currentQuestionIndex === data.questions.length - 1 ? "inline-block" : "none";
}

// Save the selected answer
function saveAnswer() {
  const data = quizData;
  const question = data.questions[currentQuestionIndex];
  if (question.type === "multiple-choice") {
    const selected = document.querySelector('input[name="answer"]:checked');
    if (!selected) return false; // No answer selected
    userAnswers[currentQuestionIndex] = parseInt(selected.value, 10);
  } else if (question.type === "slider") {
    const slider = document.getElementById("slider");
    userAnswers[currentQuestionIndex] = parseInt(slider.value, 10);
  } else if (question.type === "rank") {
    const items = document.querySelectorAll("#sortable .sortable-item");
    userAnswers[currentQuestionIndex] = Array.from(items).map((item) => item.dataset.value);
  }
  return true;
}

// Handle next button click
document.getElementById("next-btn").addEventListener("click", () => {
  if (!saveAnswer()) {
    alert("Please select an answer before proceeding.");
    return;
  }
  renderQuestion();
});

// Handle previous button click
document.getElementById("prev-btn").addEventListener("click", () => {
  currentQuestionIndex--;
  renderQuestion();
});

// Handle quiz submission
document.getElementById("submit-btn").addEventListener("click", () => {
  if (!saveAnswer()) {
    alert("Please select an answer before proceeding.");
    return;
  }
  renderResult();
});

// Render the final result
function renderResult() {
  const data = quizData;

  // Process the results based on user answers
  userAnswers.forEach((answer, index) => {
    const question = data.questions[index];
    if (question.type === "multiple-choice") {
      const selectedOption = question.options[answer];
      if (selectedOption) {
        for (const result in selectedOption.scores) {
          scores[result] += selectedOption.scores[result];
        }
      }
    } else if (question.type === "slider") {
      for (const result in question.scoreImpact) {
        const range = question.scoreImpact[result];
        const value = answer;
        const impact = ((range[1] - range[0]) / (question.max - question.min)) * (value - question.min) + range[0];
        scores[result] += impact;
      }
    } else if (question.type === "rank") {
      answer.forEach((optionText, rank) => {
        const option = question.options.find((opt) => opt.text === optionText);
        if (option && option.scores) {
          for (const result in option.scores) {
            scores[result] += option.scores[result][rank] || 0;
          }
        }
      });
    }
  });

  // Display the result with the highest score
  const highestScoreResult = Object.keys(scores).reduce((a, b) => (scores[a] > scores[b] ? a : b));
  const questionContainer = document.getElementById("question-container");
  questionContainer.innerHTML = `
    <h2>Your Result: ${highestScoreResult}</h2>
    <img src="${data.results[highestScoreResult].image}" alt="${highestScoreResult}" style="max-width: 100%; height: auto;">
    <p>${data.results[highestScoreResult].description}</p>
  `;

  // Remove unnecessary buttons
  document.getElementById("prev-btn").style.display = "none";
  document.getElementById("next-btn").style.display = "none";
  document.getElementById("submit-btn").style.display = "none";
}
