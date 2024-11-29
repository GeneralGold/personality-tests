// Extract the quiz name from the URL query parameters
const urlParams = new URLSearchParams(window.location.search);
const quizName = urlParams.get('quiz'); // This will give you the value of the 'quiz' parameter

if (!quizName) {
  alert('No quiz specified! Please provide a quiz name in the URL like ?quiz=pokemon.');
} else {
  // Construct the URL to fetch the JSON for the quiz
  const quizUrl = `/quiz/${quizName}.json`;

  // Fetch the quiz JSON data dynamically
  fetch(quizUrl)
    .then((response) => response.json())
    .then((data) => {
      const testData = data;

      // Variables for managing the quiz state
      let currentQuestionIndex = 0;
      let userAnswers = [];
      const scores = { Pikachu: 0, Charizard: 0 }; // Adjust based on the quiz

      const questionContainer = document.getElementById("question-container");
      const prevBtn = document.getElementById("prev-btn");
      const nextBtn = document.getElementById("next-btn");
      const submitBtn = document.getElementById("submit-btn");

      // Render the current question and answers
      function renderQuestion() {
        const question = testData.questions[currentQuestionIndex];

        // Render question text and image (if available)
        questionContainer.innerHTML = `
          <h2>${question.text}</h2>
          ${question.image ? `<img src="${question.image}" alt="Question Image" style="max-width: 100%; height: auto; margin: 10px 0;">` : ""}
          <div>
            ${question.options
              .map(
                (option, index) => `
              <label>
                <input type="radio" name="answer" value="${index}" ${
                  userAnswers[currentQuestionIndex] === index ? "checked" : ""
                } />
                ${option.text}
              </label><br/>
            `
              )
              .join("")}
          </div>
        `;

        // Update button visibility
        prevBtn.style.display = currentQuestionIndex === 0 ? "none" : "inline-block";
        nextBtn.style.display =
          currentQuestionIndex < testData.questions.length - 1
            ? "inline-block"
            : "none";
        submitBtn.style.display =
          currentQuestionIndex === testData.questions.length - 1
            ? "inline-block"
            : "none";
      }

      // Function to save the answer
      function saveAnswer() {
        const selected = document.querySelector('input[name="answer"]:checked');
        if (!selected) return null; // No answer selected
        userAnswers[currentQuestionIndex] = parseInt(selected.value, 10);
        return true;
      }

      // Handle submit button click
      submitBtn.addEventListener("click", () => {
        if (!saveAnswer()) {
          alert("Please select an answer before submitting.");
          return;
        }

        // Calculate the final scores
        userAnswers.forEach((answerIndex, questionIndex) => {
          const selectedOption = testData.questions[questionIndex].options[answerIndex];
          for (const key in selectedOption.scores) {
            scores[key] += selectedOption.scores[key];
          }
        });

        // Determine the result
        const maxScore = Math.max(...Object.values(scores));
        const topResults = Object.keys(scores).filter((key) => scores[key] === maxScore);
        const finalResult =
          topResults.length > 1
            ? topResults[Math.floor(Math.random() * topResults.length)]
            : topResults[0];

        // Display the result with image and description
        const resultData = testData.results[finalResult];
        questionContainer.innerHTML = `
          <h2>Your result is: ${finalResult}!</h2>
          ${resultData.image ? `<img src="${resultData.image}" alt="${finalResult} Image" style="max-width: 100%; height: auto; margin: 10px 0;">` : ""}
          <p>${resultData.description}</p>
        `;
        prevBtn.style.display = "none";
        nextBtn.style.display = "none";
        submitBtn.style.display = "none";
      });

      // Handle next button click
      nextBtn.addEventListener("click", () => {
        if (!saveAnswer()) {
          alert("Please select an answer before proceeding.");
          return;
        }
        currentQuestionIndex++;
        renderQuestion();
      });

      // Handle previous button click
      prevBtn.addEventListener("click", () => {
        currentQuestionIndex--;
        renderQuestion();
      });

      // Initialize the test
      renderQuestion();
    })
    .catch((error) => {
      console.error("Error loading quiz data:", error);
      alert("Error loading quiz. Please check the URL.");
    });
}
