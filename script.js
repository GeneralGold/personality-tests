// Load quiz data
const urlParams = new URLSearchParams(window.location.search);
const quizName = urlParams.get('quiz'); // Get the quiz name from the URL
const quizFile = `./quiz/${quizName}.json`; // Path to the quiz JSON

// Variables
let currentQuestionIndex = 0;
let userAnswers = [];
const scores = {}; // Keep track of scores for each result

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

    // Render the landing page content in the question-container
    const questionContainer = document.getElementById("question-container");
    if (data.landingImage) {
      questionContainer.innerHTML = `
        <img src="${data.landingImage}" alt="Landing Image" style="width: 100%; max-height: 300px;">
        <h1>${data.title}</h1>
        <p>${data.description || ''}</p>
        <button id="start-btn">Start Quiz</button>
      `;
    } else {
      questionContainer.innerHTML = `
        <h1>${data.title}</h1>
        <p>${data.description || ''}</p>
        <button id="start-btn">Start Quiz</button>
      `;
    }

    // Set up event listener for the start button
    document.getElementById("start-btn").addEventListener("click", () => {
      renderQuestion(data);
    });
  })
  .catch(error => {
    console.error("Error loading quiz data:", error);
    alert("Failed to load quiz data.");
  });

// Render the current question and answers
function renderQuestion(data) {
  const question = data.questions[currentQuestionIndex];
  const questionContainer = document.getElementById("question-container");

  // Render question text and image (if available)
  questionContainer.innerHTML = `
    <h2>${question.text}</h2>
    ${question.image ? `<img src="${question.image}" alt="Question Image" style="max-width: 60%; height: auto; margin: 10px 0;">` : ""}
    <div id="options-container">
      ${question.type === "rank" ? renderRankOptions(question) :
        question.type === "slider" ? renderSlider(question) :
        question.options.map((option, index) => `
        <label>
          <input type="radio" name="answer" value="${index}" />
          ${option.text}
        </label><br/>
      `).join('')}
    </div>
    <div class="button-container">
      <button id="prev-btn" style="display: ${currentQuestionIndex === 0 ? 'none' : 'inline-block'}">Previous</button>
      <button id="next-btn" style="display: ${currentQuestionIndex < data.questions.length - 1 ? 'inline-block' : 'none'}">Next</button>
      <button id="submit-btn" style="display: ${currentQuestionIndex === data.questions.length - 1 ? 'inline-block' : 'none'}">Submit</button>
    </div>
  `;

  // Update button visibility
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const submitBtn = document.getElementById("submit-btn");

  prevBtn.style.display = currentQuestionIndex === 0 ? "none" : "inline-block";
  nextBtn.style.display = currentQuestionIndex < data.questions.length - 1 ? "inline-block" : "none";
  submitBtn.style.display = currentQuestionIndex === data.questions.length - 1 ? "inline-block" : "none";

  // Attach event listeners to buttons
  document.getElementById("next-btn").addEventListener("click", () => {
    if (!saveAnswer()) {
      alert("Please select an answer before proceeding.");
      return;
    }

    // Move to the next question
    currentQuestionIndex++;
    if (currentQuestionIndex < data.questions.length) {
      renderQuestion(data);
    }
  });

  document.getElementById("prev-btn").addEventListener("click", () => {
    currentQuestionIndex--;
    renderQuestion(data);
  });

  document.getElementById("submit-btn").addEventListener("click", () => {
    if (!saveAnswer()) {
      alert("Please select an answer before proceeding.");
      return;
    }

    // Calculate the final score based on the answers
    calculateScore(data);
  });
}

// Render rank question (options should be draggable)
function renderRankOptions(question) {
  return `
    <ul id="rank-options" style="list-style: none; padding: 0;">
      ${question.options.map((option, index) => `
        <li draggable="true" class="rank-option" data-index="${index}">
          ${option.text}
        </li>
      `).join('')}
    </ul>
  `;
}

// Render slider question
function renderSlider(question) {
  return `
    <label for="slider">${question.text}</label>
    <input type="range" id="slider" name="slider" min="${question.min}" max="${question.max}" value="${question.min}">
    <span id="slider-value">${question.min}</span>
  `;
}

// Initialize drag-and-drop functionality for rank options
document.addEventListener('DOMContentLoaded', () => {
  const rankOptions = document.querySelectorAll('.rank-option');
  rankOptions.forEach(option => {
    option.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', e.target.dataset.index);
    });
    option.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    option.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggedIndex = e.dataTransfer.getData('text/plain');
      const targetIndex = e.target.dataset.index;

      const optionsContainer = document.getElementById('rank-options');
      const draggedOption = optionsContainer.children[draggedIndex];
      const targetOption = optionsContainer.children[targetIndex];

      optionsContainer.insertBefore(draggedOption, targetOption);
    });
  });
});

// Save the selected answer (for radio, rank, or slider options)
function saveAnswer() {
  const selected = document.querySelector('input[name="answer"]:checked');
  if (selected) {
    userAnswers[currentQuestionIndex] = selected.value;
  } else if (document.getElementById("slider")) {
    const sliderValue = document.getElementById("slider").value;
    userAnswers[currentQuestionIndex] = sliderValue;
  } else if (document.querySelectorAll('.rank-option').length) {
    const rankOptions = document.querySelectorAll('.rank-option');
    userAnswers[currentQuestionIndex] = Array.from(rankOptions).map(option => option.dataset.index);
  } else {
    return false; // No answer selected
  }
  return true;
}

// Calculate the final score based on the answers
function calculateScore(data) {
  userAnswers.forEach((answer, index) => {
    const question = data.questions[index];
    if (question.type === 'rank') {
      // Calculate score for ranking question
      answer.forEach((rank, idx) => {
        const points = question.options[rank].points;
        scores[question.options[rank].result] += points;
      });
    } else {
      // Calculate score for radio buttons and slider
      const option = question.options[answer];
      if (question.type === 'slider') {
        scores[option.result] += parseInt(answer); // Slider is numeric
      } else {
        scores[option.result] += option.points;
      }
    }
  });

  // Show the result in the question-container
  displayResult(data);
}

// Display the result after quiz completion
function displayResult(data) {
  const questionContainer = document.getElementById("question-container");
  questionContainer.innerHTML = `
    <h2>Your Result:</h2>
    <p>${data.results[Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b)]}</p>
  `;

  // Hide the buttons after the result is shown
  const buttonContainer = document.querySelector(".button-container");
  if (buttonContainer) buttonContainer.style.display = "none";
}
