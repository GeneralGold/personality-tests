let currentQuestionIndex = 0;
let userAnswers = [];
let scores = {}; // To track results

// Load the quiz data dynamically from the URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const quizName = urlParams.get('quiz'); // Get quiz name from the URL
const quizFile = `./quiz/${quizName}.json`; // Path to the quiz JSON file

// Fetch quiz data from the JSON file
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
    // Set quiz title and description dynamically
    document.title = data.title || 'Quiz';

    // Display landing image and description
    const landingImage = data.landingImage || '';  // Ensure this is the correct key for landing image
    const landingTitle = data.title || '';
    const landingDescription = data.description || '';

    const landingContainer = document.getElementById("landing-container");
    landingContainer.innerHTML = `
      <img src="/images/${landingImage}" alt="Landing Image" style="max-width: 100%; height: auto; margin-bottom: 20px;">
      <h2>${landingTitle}</h2>
      <p>${landingDescription}</p>
      <button id="start-btn">Start Quiz</button>
    `;

    document.getElementById("start-btn").addEventListener("click", function() {
      // Start quiz by rendering the first question
      renderQuestion(data);
      landingContainer.style.display = "none";
      document.getElementById("question-container").style.display = "block";
    });

    // Initialize scores for results
    for (const result in data.results) {
      scores[result] = 0;
    }
  })
  .catch(error => {
    console.error("Error loading quiz data:", error);
    alert("Failed to load quiz data.");
  });

// Function to render the current question
function renderQuestion(data) {
  const question = data.questions[currentQuestionIndex];
  const questionContainer = document.getElementById("question-container");

  let questionContent = `
    <h2>${question.text}</h2>
    ${question.image ? `<img src="/images/${question.image}" alt="Question Image" style="max-width: 80%; height: auto; margin: 10px auto; display: block;">` : ""}
  `;

  // Handle different question types
  if (question.type === "multiple-choice") {
    questionContent += `
      <div>
        ${question.options.map((option, index) => `
          <label>
            <input type="radio" name="answer" value="${index}" />
            ${option.text}
          </label><br/>
        `).join("")}
      </div>
    `;
  } else if (question.type === "slider") {
    questionContent += `
      <input type="range" id="slider" min="${question.min}" max="${question.max}" step="${question.step}" />
      <p id="slider-value">${question.min}</p>
      <p>${question.description || ''}</p>
    `;
  } else if (question.type === "rank") {
    questionContent += `
      <ul id="ranking-list" style="list-style-type: none; padding: 0;">
        ${question.options.map((option, index) => `
          <li class="draggable" id="option-${index}" draggable="true">${option.text}</li>
        `).join("")}
      </ul>
      <p>Drag to rank the options from top to bottom.</p>
    `;
  }

  // Render the question content into the container
  questionContainer.innerHTML = questionContent;

  // Add draggable functionality for ranking question
  if (question.type === "rank") {
    const draggables = document.querySelectorAll('.draggable');
    const container = document.getElementById('ranking-list');

    draggables.forEach(draggable => {
      draggable.addEventListener('dragstart', (e) => {
        e.target.classList.add('dragging');
      });

      draggable.addEventListener('dragend', () => {
        const draggedItem = document.querySelector('.dragging');
        draggedItem.classList.remove('dragging');
      });
    });

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(container, e.clientY);
      const draggable = document.querySelector('.dragging');
      if (afterElement == null) {
        container.appendChild(draggable);
      } else {
        container.insertBefore(draggable, afterElement);
      }
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggable = document.querySelector('.dragging');
      container.appendChild(draggable);
    });
  }

  // Update button visibility
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const submitBtn = document.getElementById("submit-btn");

  prevBtn.style.display = currentQuestionIndex === 0 ? "none" : "inline-block";
  nextBtn.style.display = currentQuestionIndex < data.questions.length - 1 ? "inline-block" : "none";
  submitBtn.style.display = currentQuestionIndex === data.questions.length - 1 ? "inline-block" : "none";

  // Handle slider update
  if (question.type === 'slider') {
    const slider = document.getElementById("slider");
    const sliderValue = document.getElementById("slider-value");
    slider.addEventListener('input', (event) => {
      sliderValue.textContent = event.target.value;
    });
  }
}

// Function to determine the order of elements based on drag position
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.draggable:not(.dragging)')];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Save the selected answer
function saveAnswer() {
  const question = data.questions[currentQuestionIndex];
  if (question.type === 'rank') {
    // For rank, get the order of the answers
    const order = [];
    const rankedOptions = document.querySelectorAll('.draggable');
    rankedOptions.forEach((option, index) => {
      order.push(option.textContent.trim());
    });
    userAnswers[currentQuestionIndex] = order;
  } else {
    const selected = document.querySelector('input[name="answer"]:checked');
    if (!selected) return false; // No answer selected
    userAnswers[currentQuestionIndex] = parseInt(selected.value, 10);
  }
  return true;
}

// Handle next button click
document.getElementById("next-btn").addEventListener("click", () => {
  if (!saveAnswer()) {
    alert("Please select an answer before proceeding.");
    return;
  }
  currentQuestionIndex++;
  renderQuestion(data);
});

// Handle previous button click
document.getElementById("prev-btn").addEventListener("click", () => {
  currentQuestionIndex--;
  renderQuestion(data);
});

// Handle quiz submission
document.getElementById("submit-btn").addEventListener("click", () => {
  // Process the results based on user answers
  const resultContainer = document.getElementById("result-container");
  const results = data.results;

  // Tally up the scores based on user answers
  userAnswers.forEach((answer, index) => {
    const question = data.questions[index];
    if (question.type === 'rank') {
      const selectedOrder = answer;  // The ranked order
      question.options.forEach((option, i) => {
        const rankScore = option.scores[selectedOrder.indexOf(option.text)];
        scores[option.text] = (scores[option.text] || 0) + rankScore;
      });
    } else {
      const selectedOption = question.options[answer];
      if (selectedOption) {
        for (const result in selectedOption.scores) {
          scores[result] = (scores[result] || 0) + selectedOption.scores[result];
        }
      }
    }
  });

  // Display result
  const highestScoreResult = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
  resultContainer.innerHTML = `
    <h2>Your Result: ${highestScoreResult}</h2>
    <img src="/images/${data.results[highestScoreResult].image}" alt="${highestScoreResult}" style="max-width: 100%; height: auto;">
    <p>${data.results[highestScoreResult].description}</p>
  `;

  // Remove buttons
  document.getElementById("submit-btn").style.display = "none";
  document.getElementById("prev-btn").style.display = "none";
  document.getElementById("next-btn").style.display = "none";
});
