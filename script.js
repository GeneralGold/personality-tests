// Load JSON data
const urlParams = new URLSearchParams(window.location.search);
const quizName = urlParams.get('quiz'); // Get the quiz name from the URL
const quizFile = `./quiz/${quizName}.json`; // Path to the quiz JSON

// Variables
let currentQuestionIndex = 0;
let userAnswers = [];
let quizStarted = false; // Track if the quiz has started
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

    // Store the quiz data in local storage to use later for submitting
    localStorage.setItem('quizData', JSON.stringify(data));

    // Render the landing page
    renderLandingPage(data);
  })
  .catch(error => {
    console.error("Error loading quiz data:", error);
    alert("Failed to load quiz data.");
  });

// Render the landing page
function renderLandingPage(data) {
  const questionContainer = document.getElementById("question-container");
  questionContainer.innerHTML = `
    <h1>${data.title}</h1>
    ${data.landingImage ? `<img src="${data.landingImage}" alt="Quiz Image" style="max-width: 100%; height: auto;">` : ""}
    <p>${data.description || ''}</p>
    <button id="play-btn" style="margin-top: 20px; padding: 10px 20px; font-size: 16px;">Play</button>
  `;

  // Add event listener to the play button
  document.getElementById("play-btn").addEventListener("click", () => {
    quizStarted = true;
    renderQuestion(JSON.parse(localStorage.getItem('quizData')));
  });

  // Hide navigation buttons initially
  document.getElementById("prev-btn").style.display = "none";
  document.getElementById("next-btn").style.display = "none";
  document.getElementById("submit-btn").style.display = "none";
}

// Render the current question and answers
function renderQuestion(data) {
  const question = data.questions[currentQuestionIndex];

  // Render question text and image (if available)
  const questionContainer = document.getElementById("question-container");
  questionContainer.innerHTML = `
    <h2>${question.text}</h2>
    ${question.image ? `<img src="${question.image}" alt="Question Image" style="max-width: 100%; height: auto; margin: 10px 0;">` : ""}
    <div>
      ${question.options
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
        : ""}
    </div>
    ${question.type === 'slider' ? `
      <input type="range" id="slider" min="${question.min}" max="${question.max}" step="${question.step}" value="${question.min}" />
      <p id="slider-value">${question.min}</p>
      <p>${question.description || ''}</p>
    ` : ''}
    ${question.type === 'ranking' ? `
      <ul id="rank-list">
        ${question.options
          ? question.options
              .map((option, index) => `
                <li id="rank-item-${index}" draggable="true">
                  ${option.text}
                </li>
              `)
              .join("")
          : ""}
      </ul>
      <p>${question.description || ''}</p>
    ` : ''}
  `;

  // Update button visibility
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const submitBtn = document.getElementById("submit-btn");

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

  // Initialize drag-and-drop for ranking options if applicable
  if (question.type === 'ranking') {
    initRanking();
  }
}

// Initialize the draggable ranking functionality
function initRanking() {
  const rankList = document.getElementById("rank-list");

  // Add event listener to handle dragging start
  rankList.addEventListener('dragstart', (event) => {
    // Store the dragged item
    event.dataTransfer.setData('text/plain', event.target.id);
    event.target.style.opacity = 0.5; // Make the dragged item semi-transparent
  });

  // Add event listener to handle dragging end
  rankList.addEventListener('dragend', (event) => {
    event.target.style.opacity = ""; // Reset opacity when dragging ends
  });

  // Make the list items droppable
  const listItems = document.querySelectorAll('#rank-list li');
  listItems.forEach(item => {
    item.addEventListener('dragover', (event) => {
      event.preventDefault();  // Allow dropping by preventing the default action
    });

    item.addEventListener('dragenter', (event) => {
      event.preventDefault();  // Allow the drop
      event.target.style.backgroundColor = '#f1f1f1';  // Highlight the target item
    });

    item.addEventListener('dragleave', (event) => {
      event.target.style.backgroundColor = '';  // Remove highlight when dragging leaves
    });

    item.addEventListener('drop', (event) => {
      event.preventDefault();
      const draggedId = event.dataTransfer.getData('text/plain');
      const draggedItem = document.getElementById(draggedId);
      const targetItem = event.target;

      // If the dragged item is not the target item, reorder the items
      if (draggedItem !== targetItem) {
        const allItems = [...rankList.children];
        const draggedIndex = allItems.indexOf(draggedItem);
        const targetIndex = allItems.indexOf(targetItem);

        // Remove dragged item and insert it before the target item
        if (draggedIndex < targetIndex) {
          rankList.insertBefore(draggedItem, targetItem.nextSibling);
        } else {
          rankList.insertBefore(draggedItem, targetItem);
        }
      }

      // Remove the highlight from the target item
      targetItem.style.backgroundColor = '';
    });
  });
}

// Save the selected answer
function saveAnswer() {
  const question = JSON.parse(localStorage.getItem('quizData')).questions[currentQuestionIndex];

  // If it's a slider question, check if a value has been selected
  if (question.type === 'slider') {
    const slider = document.getElementById('slider');
    if (!slider) return false; // If no slider, return false
    userAnswers[currentQuestionIndex] = slider.value;
  } else {
    // For other questions (radio buttons)
    const selected = document.querySelector('input[name="answer"]:checked');
    if (!selected) return false; // No answer selected, return false
    userAnswers[currentQuestionIndex] = parseInt(selected.value, 10);
  }

  return true; // Return true if answer was saved
}

// Handle next button click
document.getElementById("next-btn").addEventListener("click", () => {
  if (!saveAnswer()) {
    alert("Please select an answer before proceeding.");
    return;
  }
  currentQuestionIndex++;
  renderQuestion(JSON.parse(localStorage.getItem('quizData')));
});

// Handle previous button click
document.getElementById("prev-btn").addEventListener("click", () => {
  currentQuestionIndex--;
  renderQuestion(JSON.parse(localStorage.getItem('quizData')));
});

// Handle quiz submission
document.getElementById("submit-btn").addEventListener("click", () => {
  const quizData = JSON.parse(localStorage.getItem('quizData')); // Ensure quizData is loaded correctly
  const results = quizData.results;

  // Reset scores before calculating the results
  const scores = {};

  // Calculate the score based on the user's answers
  userAnswers.forEach((answer, index) => {
    const question = quizData.questions[index];
    const selectedOption = question.options ? question.options[answer] : null;
    if (selectedOption) {
      for (const result in selectedOption.scores) {
        scores[result] = (scores[result] || 0) + selectedOption.scores[result];
      }
    }
  });

  // Find the result with the highest score
  const highestScoreResult = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);

  // Display the result
  const questionContainer = document.getElementById("question-container");
  questionContainer.innerHTML = `
    <h2>Your Result: ${highestScoreResult}</h2>
    <img src="${quizData.results[highestScoreResult].image}" alt="${highestScoreResult}" style="max-width: 100%; height: auto;">
    <p>${quizData.results[highestScoreResult].description}</p>
  `;
});
