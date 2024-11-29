// Safely get elements by ID
function getElementByIdSafe(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.error(`Error: element with id "${id}" not found.`);
  }
  return element;
}

// Get elements from the DOM
const prevBtn = getElementByIdSafe("prev-btn");
const nextBtn = getElementByIdSafe("next-btn");
const submitBtn = getElementByIdSafe("submit-btn");
const questionContainer = getElementByIdSafe("question-container");

// Ensure all elements are found before proceeding
if (!questionContainer || !prevBtn || !nextBtn || !submitBtn) {
  console.error("Error: Missing required HTML elements.");
  return; // Stop script execution if any required element is missing
}

// Variables for quiz state
let currentQuestionIndex = 0;
let userAnswers = [];
const scores = {}; // Keep track of scores for each result

// Fetch the quiz data based on the URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const quizName = urlParams.get('quiz'); // Get the quiz name from the URL
const quizFile = `./quiz/${quizName}.json`; // Path to the quiz JSON

// Fetch quiz data
fetch(quizFile)
  .then(response => {
    if (!response.ok) {
      console.error("Failed to load quiz data:", response.statusText);
      alert("Failed to load quiz data.");
      return;
    }
    return response.json();
  })
  .then(data => {
    // Set the title dynamically from the JSON file
    document.title = data.title || 'Quiz';

    // Initialize results scores
    for (const result in data.results) {
      scores[result] = 0;
    }

    // Render the first question
    renderQuestion(data);
  })
  .catch(error => {
    console.error("Error loading quiz data:", error);
    alert("Failed to load quiz data.");
  });

// Render the current question and answers
function renderQuestion(data) {
  const question = data.questions[currentQuestionIndex];

  // Render question text and image (if available)
  questionContainer.innerHTML = `
    <h2>${question.text}</h2>
    ${question.image ? `<img src="${question.image}" alt="Question Image" style="max-width: 100%; height: auto; margin: 10px 0;">` : ""}
    <div>
      ${question.options
        ? question.options.map(
            (option, index) => `
              <label>
                <input type="radio" name="answer" value="${index}" />
                ${option.text}
              </label><br/>
            `
          ).join("")
        : ""}
    </div>
    ${question.type === 'slider' ? `
      <input type="range" id="slider" min="${question.min}" max="${question.max}" step="${question.step}" value="${question.min}" />
      <p id="slider-value">${question.min}</p>
      <p>${question.description || ''}</p>
    ` : ''}
  `;

  // Update button visibility
  prevBtn.style.display = currentQuestionIndex === 0 ? "none" : "inline-block";
  nextBtn.style.display = currentQuestionIndex < data.questions.length - 1 ? "inline-block" : "none";
  submitBtn.style.display = currentQuestionIndex === data.questions.length - 1 ? "inline-block" : "none";

  // Add slider value update functionality
  if (question.type === 'slider') {
    const slider = document.getElementById("slider");
    const sliderValue = document.getElementById("slider-value");
    slider.addEventListener('input', (event) => {
      sliderValue.textContent = event.target.value;
    });
  }
}

// Save the selected answer
function saveAnswer() {
  const selected = document.querySelector('input[name="answer"]:checked');
  if (!selected && document.getElementById("slider") === null) {
    return false; // No answer selected and no slider available
  }

  if (selected) {
    userAnswers[currentQuestionIndex] = parseInt(selected.value, 10);
  } else if (document.getElementById("slider")) {
    const slider = document.getElementById("slider");
    userAnswers[currentQuestionIndex] = slider.value;
  }

  return true;
}

// Handle next button click
nextBtn.addEventListener("click", () => {
  if (!saveAnswer()) {
    alert("Please select an answer before proceeding.");
    return;
  }
  currentQuestionIndex++;
  renderQuestion(data);
});

// Handle previous button click
prevBtn.addEventListener("click", () => {
  currentQuestionIndex--;
  renderQuestion(data);
});

// Handle quiz submission
submitBtn.addEventListener("click", () => {
  // Process the results based on user answers
  const quizData = JSON.parse(localStorage.getItem('quizData'));
  const results = quizData.results;

  // Example of tallying scores from user answers
  userAnswers.forEach((answer, index) => {
    const question = quizData.questions[index];
    const selectedOption = question.options ? question.options[answer] : null;
    if (selectedOption) {
      for (const result in selectedOption.scores) {
        scores[result] += selectedOption.scores[result];
      }
    }
  });

  // Display the result with the highest score
  const highestScoreResult = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
  questionContainer.innerHTML = `
    <h2>Your Result: ${highestScoreResult}</h2>
    <img src="${quizData.results[highestScoreResult].image}" alt="${highestScoreResult}" style="max-width: 100%; height: auto;">
    <p>${quizData.results[highestScoreResult].description}</p>
  `;
});
