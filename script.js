// Load JSON data
const urlParams = new URLSearchParams(window.location.search);
const quizName = urlParams.get("quiz"); // Get the quiz name from the URL
const quizFile = `./quiz/${quizName}.json`; // Path to the quiz JSON

// Variables
let currentQuestionIndex = 0;
let userAnswers = [];
let quizData = null;
const scores = {}; // Keep track of scores for each result

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

    // Show landing page
    renderLandingPage(data);
  })
  .catch((error) => {
    console.error("Error loading quiz data:", error);
    alert("Failed to load quiz data.");
  });

// Render the landing page
function renderLandingPage(data) {
  const questionContainer = document.getElementById("question-container");
  questionContainer.innerHTML = `
    <div id="landing-page">
      <h1>${data.title}</h1>
      ${data.description ? `<p>${data.description}</p>` : ""}
      ${
        data.image
          ? `<img src="${data.image}" alt="Quiz Image" style="max-width: 100%; height: auto; margin: 10px 0;">`
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
  const question = quizData.questions[currentQuestionIndex];
  const questionContainer = document.getElementById("question-container");

  if (question.type === "rank") {
    renderRankQuestion(question);
  } else {
    renderStandardQuestion(question);
  }

  // Update button visibility
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const submitBtn = document.getElementById("submit-btn");

  prevBtn.style.display = currentQuestionIndex === 0 ? "none" : "inline-block";
  nextBtn.style.display =
    currentQuestionIndex < quizData.questions.length - 1
      ? "inline-block"
      : "none";
  submitBtn.style.display =
    currentQuestionIndex === quizData.questions.length - 1
      ? "inline-block"
      : "none";
}

// Render a standard question (multiple choice or slider)
function renderStandardQuestion(question) {
  const questionContainer = document.getElementById("question-container");

  // Render question text and image (if available)
  questionContainer.innerHTML = `
    <h2>${question.text}</h2>
    ${
      question.image
        ? `<img src="${question.image}" alt="Question Image" style="max-width: 100%; height: auto; margin: 10px 0;">`
        : ""
    }
    <div>
      ${
        question.options
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
          : ""
      }
    </div>
    ${
      question.type === "slider"
        ? `
      <input type="range" id="slider" min="${question.min}" max="${question.max}" step="${question.step}" value="${question.min}" />
      <p id="slider-value">${question.min}</p>
      <p>${question.description || ""}</p>
    `
        : ""
    }
  `;

  // Add slider value update functionality
  if (question.type === "slider") {
    const slider = document.getElementById("slider");
    const sliderValue = document.getElementById("slider-value");
    slider.addEventListener("input", (event) => {
      sliderValue.textContent = event.target.value;
    });
  }
}

// Render a rank question
function renderRankQuestion(question) {
  const questionContainer = document.getElementById("question-container");

  questionContainer.innerHTML = `<h2>${question.text}</h2>`;

  const listContainer = document.createElement("ul");
  listContainer.id = "rank-list";
  listContainer.style.listStyleType = "none";
  listContainer.style.padding = "0";

  question.options.forEach((option) => {
    const listItem = document.createElement("li");
    listItem.textContent = option.text;
    listItem.draggable = true;
    listItem.style.border = "1px solid #ccc";
    listItem.style.padding = "10px";
    listItem.style.margin = "5px 0";
    listItem.style.cursor = "grab";
    listContainer.appendChild(listItem);
  });

  questionContainer.appendChild(listContainer);

  addDragAndDropListeners(listContainer);
}

// Add drag-and-drop functionality
function addDragAndDropListeners(container) {
  let draggedItem = null;

  container.addEventListener("dragstart", (event) => {
    draggedItem = event.target;
    event.target.style.opacity = 0.5;
  });

  container.addEventListener("dragend", (event) => {
    draggedItem = null;
    event.target.style.opacity = 1;
  });

  container.addEventListener("dragover", (event) => {
    event.preventDefault();
    const closestItem = event.target;
    if (closestItem && closestItem !== draggedItem && closestItem.nodeName === "LI") {
      container.insertBefore(draggedItem, closestItem.nextSibling);
    }
  });
}

// Save the selected answer
function saveAnswer() {
  const question = quizData.questions[currentQuestionIndex];

  if (question.type === "rank") {
    return saveRankAnswer(question);
  }

  const selected = document.querySelector('input[name="answer"]:checked');
  if (question.type === "slider") {
    const slider = document.getElementById("slider");
    userAnswers[currentQuestionIndex] = parseInt(slider.value, 10);
    return true;
  }
  if (!selected) return false;
  userAnswers[currentQuestionIndex] = parseInt(selected.value, 10);
  return true;
}

// Save ranking answers
function saveRankAnswer(question) {
  const rankList = document.getElementById("rank-list");
  if (!rankList) return false;

  const rankedOrder = [...rankList.children].map((item, index) => ({
    text: item.textContent,
    rank: index + 1
  }));

  userAnswers[currentQuestionIndex] = rankedOrder;

  rankedOrder.forEach((rankedItem) => {
    const option = question.options.find((opt) => opt.text === rankedItem.text);
    const rankScores = option?.scores[rankedItem.rank];
    if (rankScores) {
      for (const result in rankScores) {
        scores[result] += rankScores[result];
      }
    }
  });

  return true;
}

// Handle next button click
document.getElementById("next-btn").addEventListener("click", () => {
  if (!saveAnswer()) {
    alert("Please select an answer before proceeding.");
    return;
  }
  currentQuestionIndex++;
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

  const resultContainer = document.getElementById("question-container");
  const highestScoreResult = Object.keys(scores).reduce((a, b) =>
    scores[a] > scores[b] ? a : b
  );

  resultContainer.innerHTML = `
    <h2>Your Result: ${highestScoreResult}</h2>
    <img src="${quizData.results[highestScoreResult].image}" alt="${highestScoreResult}" style="max-width: 100%; height: auto;">
    <p>${quizData.results[highestScoreResult].description}</p>
  `;
});
