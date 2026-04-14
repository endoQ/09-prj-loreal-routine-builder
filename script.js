/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

let selectedProducts = [];
const generateBtn = document.getElementById("generateRoutine");
let conversationHistory = [
  {
    role: "system",
    content: `
You are a beauty and personal care expert.

You MUST follow these rules strictly:
- Only answer questions related to the generated routine or beauty topics (skincare, haircare, makeup, fragrance, grooming).
- If a question is unrelated, politely refuse.
- Do NOT go off-topic.
- Be clear, structured, and helpful.
- Keep responses concise but informative.
`,
  },
];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

loadSelections();
updateSelectedProductsUI();

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.some((p) => p.id === product.id);

      return `
        <div class="product-card ${isSelected ? "selected" : ""}" data-id="${product.id}">
          <img src="${product.image}" alt="${product.name}">
          
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>

            <button class="toggle-desc-btn">
              View Details
            </button>

            <div class="product-description">
              ${product.description}
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  // Card click (selection)
  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      // Prevent toggle button from triggering selection
      if (e.target.classList.contains("toggle-desc-btn")) return;

      const productId = Number(card.dataset.id);
      toggleProduct(productId, products);
    });
  });

  // Toggle description
  document.querySelectorAll(".toggle-desc-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      const desc = btn.nextElementSibling;
      const isOpen = desc.classList.contains("open");

      desc.classList.toggle("open");
      btn.textContent = isOpen ? "View Details" : "Hide Details";
    });
  });
}

const clearBtn = document.getElementById("clearAllBtn");

clearBtn.addEventListener("click", () => {
  selectedProducts = [];
  saveSelections();
  updateSelectedProductsUI();

  // refresh grid highlight
  categoryFilter.dispatchEvent(new Event("change"));
});

function toggleProduct(productId, products) {
  const index = selectedProducts.findIndex((p) => p.id === productId);

  if (index > -1) {
    // remove
    selectedProducts.splice(index, 1);
  } else {
    // add
    const product = products.find((p) => p.id === productId);
    selectedProducts.push(product);
  }

  saveSelections();

  updateSelectedProductsUI();
  displayProducts(products); // re-render to update highlight
}

function updateSelectedProductsUI() {
  const container = document.getElementById("selectedProductsList");

  if (selectedProducts.length === 0) {
    container.innerHTML = "<p>No products selected</p>";
    return;
  }

  container.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-item">
        <span>${product.name}&nbsp;</span>
        <button data-id="${product.id}" class="remove-btn">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `,
    )
    .join("");

  document.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // prevent card click conflict

      const id = Number(btn.dataset.id);
      selectedProducts = selectedProducts.filter((p) => p.id !== id);

      saveSelections();

      updateSelectedProductsUI();

      categoryFilter.dispatchEvent(new Event("change"));
    });
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory,
  );

  displayProducts(filteredProducts);
});

function formatRoutine(text) {
  let formatted = text
    // Headings
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")

    // Remove empty lines (this is key)
    .replace(/\n\s*\n/g, "\n")

    // Bold
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")

    // Numbered steps
    .replace(/^\d+\.\s+(.*)$/gim, "<li>$1</li>");

  // Wrap list
  if (formatted.includes("<li>")) {
    formatted = formatted.replace(/(<li>[\s\S]*<\/li>)/gim, "<ol>$1</ol>");
  }

  // Line breaks (LESS aggressive)
  formatted = formatted.replace(/\n/g, "<br>");

  return `<div class="routine-output">${formatted}</div>`;
}

generateBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML = "Please select at least one product.";
    return;
  }

  const productData = selectedProducts.map((p) => ({
    name: p.name,
    brand: p.brand,
    category: p.category,
    description: p.description,
  }));

  const userMessage = {
    role: "user",
    content: `Create a personalized daily routine using these products:
${JSON.stringify(productData, null, 2)}`,
  };

  // Add to history
  conversationHistory.push(userMessage);

  chatWindow.innerHTML = "Generating your routine...";

  try {
    const response = await fetch(
      "https://twilight-snowflake-ac64.gurizar.workers.dev",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: conversationHistory }),
      },
    );

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No response.";

    // Save assistant response
    conversationHistory.push({
      role: "assistant",
      content: reply,
    });

    appendMessage("assistant", reply);
  } catch (err) {
    chatWindow.innerHTML = "Error generating routine.";
  }
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const input = document.getElementById("userInput");
  const userText = input.value.trim();
  if (!userText) return;

  // Show user message
  appendMessage("user", userText);

  // Add to history
  conversationHistory.push({
    role: "user",
    content: userText,
  });

  input.value = "";

  try {
    const response = await fetch(
      "https://twilight-snowflake-ac64.gurizar.workers.dev",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: conversationHistory }),
      },
    );

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No response.";

    // Save assistant reply
    conversationHistory.push({
      role: "assistant",
      content: reply,
    });

    appendMessage("assistant", reply);
  } catch (error) {
    appendMessage("assistant", "Error responding. Try again.");
  }
});

function appendMessage(role, text) {
  const div = document.createElement("div");
  div.classList.add("chat-message", role);

  const formattedText = role === "assistant" ? formatRoutine(text) : text;

  div.innerHTML = `
    <div class="message-bubble">
      ${formattedText}
    </div>
  `;

  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function saveSelections() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

function loadSelections() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    selectedProducts = JSON.parse(saved);
  }
}
