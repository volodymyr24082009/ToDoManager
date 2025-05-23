// Глобальні змінні
let tasks = [];
let currentEditingTask = null;
let timerInterval = null;
let timerMinutes = 25;
let timerSeconds = 0;
let timerRunning = false;
let timerTotalSeconds = 0;
let pomodoroCycles = 0;
let pomodoroTotalTime = 0;
let categories = ["робота", "особисте", "навчання", "інше"];
let settings = {
  autoSave: true,
  showNotifications: true,
  pomodoroDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
};
let activeFilters = {
  status: ["all"],
  priority: ["all"],
  category: ["all"],
  due: ["all"],
};
let currentView = "board";
let confirmCallback = null;

// DOM елементи
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  loadSettings();
  loadTasks();
  setupEventListeners();
  updateStatistics();
  renderCategories();
});

// Налаштування обробників подій
function setupEventListeners() {
  // Форма додавання завдання
  const taskForm = document.getElementById("task-form");
  taskForm.addEventListener("submit", handleTaskFormSubmit);

  // Прогрес виконання
  const progressRange = document.getElementById("task-progress");
  const progressValue = document.getElementById("progress-value");
  progressRange.addEventListener("input", () => {
    progressValue.textContent = `${progressRange.value}%`;
  });

  // Перемикач теми
  const themeToggle = document.getElementById("theme-toggle");
  themeToggle.addEventListener("click", toggleTheme);

  // Кнопка Pomodoro
  const pomodoroBtn = document.getElementById("pomodoro-btn");
  pomodoroBtn.addEventListener("click", () => {
    document.getElementById("pomodoro-modal").style.display = "block";
  });

  // Кнопка статистики
  const statsBtn = document.getElementById("stats-btn");
  statsBtn.addEventListener("click", () => {
    updateCharts();
    document.getElementById("stats-modal").style.display = "block";
  });

  // Кнопка налаштувань
  const settingsBtn = document.getElementById("settings-btn");
  settingsBtn.addEventListener("click", () => {
    document.getElementById("settings-modal").style.display = "block";
    populateSettingsForm();
  });

  // Перемикач вигляду
  const boardViewBtn = document.getElementById("board-view-btn");
  const listViewBtn = document.getElementById("list-view-btn");

  boardViewBtn.addEventListener("click", () => {
    currentView = "board";
    document.getElementById("board-view").style.display = "grid";
    document.getElementById("list-view").style.display = "none";
    boardViewBtn.classList.add("active");
    listViewBtn.classList.remove("active");
  });

  listViewBtn.addEventListener("click", () => {
    currentView = "list";
    document.getElementById("board-view").style.display = "none";
    document.getElementById("list-view").style.display = "block";
    boardViewBtn.classList.remove("active");
    listViewBtn.classList.add("active");
    renderListView();
  });

  // Згортання/розгортання форми
  const toggleFormBtn = document.getElementById("toggle-form-btn");
  toggleFormBtn.addEventListener("click", () => {
    const formContent = document.querySelector(".form-content");
    formContent.classList.toggle("collapsed");
    toggleFormBtn.innerHTML = formContent.classList.contains("collapsed")
      ? '<span class="material-symbols-outlined">expand_more</span>'
      : '<span class="material-symbols-outlined">expand_less</span>';
  });

  // Пошук
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", () => {
    filterTasks();
  });

  // Фільтри
  document.querySelectorAll("input[data-filter]").forEach((filter) => {
    filter.addEventListener("change", handleFilterChange);
  });

  // Експорт/імпорт
  document.getElementById("export-btn").addEventListener("click", exportTasks);
  document.getElementById("import-btn").addEventListener("click", () => {
    document.getElementById("import-file").click();
  });

  document
    .getElementById("import-file")
    .addEventListener("change", importTasks);

  // Закриття модальних вікон
  document.querySelectorAll(".close").forEach((close) => {
    close.addEventListener("click", function () {
      this.closest(".modal").style.display = "none";
    });
  });

  // Закриття модальних вікон при кліку поза ними
  window.addEventListener("click", (e) => {
    document.querySelectorAll(".modal").forEach((modal) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  });

  // Кнопки Pomodoro таймера
  document.getElementById("start-timer").addEventListener("click", startTimer);
  document.getElementById("pause-timer").addEventListener("click", pauseTimer);
  document.getElementById("reset-timer").addEventListener("click", resetTimer);

  // Режими Pomodoro
  document
    .getElementById("pomodoro-mode")
    .addEventListener("click", () => setTimerMode("pomodoro"));
  document
    .getElementById("short-break-mode")
    .addEventListener("click", () => setTimerMode("shortBreak"));
  document
    .getElementById("long-break-mode")
    .addEventListener("click", () => setTimerMode("longBreak"));

  // Налаштування
  document
    .getElementById("save-settings")
    .addEventListener("click", saveSettings);
  document
    .getElementById("reset-settings")
    .addEventListener("click", resetSettings);
  document
    .getElementById("add-category")
    .addEventListener("click", addCategory);

  // Кнопка скасування редагування
  document.getElementById("cancel-edit").addEventListener("click", () => {
    currentEditingTask = null;
    document.getElementById("task-form").reset();
    document.getElementById("task-id").value = "";
    document.getElementById("progress-value").textContent = "0%";
    document.querySelector(".btn-primary").innerHTML =
      '<span class="material-symbols-outlined">add_task</span> Додати завдання';
    document.getElementById("cancel-edit").style.display = "none";
  });

  // Підтвердження
  document.getElementById("confirm-yes").addEventListener("click", () => {
    if (confirmCallback) {
      confirmCallback();
      document.getElementById("confirm-modal").style.display = "none";
    }
  });

  document.getElementById("confirm-no").addEventListener("click", () => {
    document.getElementById("confirm-modal").style.display = "none";
  });
}

// Завантаження завдань з локального сховища
function loadTasks() {
  const savedTasks = localStorage.getItem("tasks");
  if (savedTasks) {
    try {
      tasks = JSON.parse(savedTasks);
      renderTasks();
    } catch (error) {
      console.error("Помилка при завантаженні завдань:", error);
      showNotification("Помилка при завантаженні завдань", "error");
    }
  }
}

// Збереження завдань у локальне сховище
function saveTasks() {
  try {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  } catch (error) {
    console.error("Помилка при збереженні завдань:", error);
    showNotification("Помилка при збереженні завдань", "error");
  }
}

// Завантаження налаштувань
function loadSettings() {
  const savedSettings = localStorage.getItem("settings");
  if (savedSettings) {
    try {
      settings = { ...settings, ...JSON.parse(savedSettings) };
    } catch (error) {
      console.error("Помилка при завантаженні налаштувань:", error);
    }
  }

  const savedCategories = localStorage.getItem("categories");
  if (savedCategories) {
    try {
      categories = JSON.parse(savedCategories);
    } catch (error) {
      console.error("Помилка при завантаженні категорій:", error);
    }
  }
}

// Збереження налаштувань
function saveSettings() {
  settings.autoSave = document.getElementById("auto-save").checked;
  settings.showNotifications =
    document.getElementById("show-notifications").checked;
  settings.pomodoroDuration = parseInt(
    document.getElementById("pomodoro-duration").value
  );
  settings.shortBreakDuration = parseInt(
    document.getElementById("short-break-duration").value
  );
  settings.longBreakDuration = parseInt(
    document.getElementById("long-break-duration").value
  );

  localStorage.setItem("settings", JSON.stringify(settings));
  localStorage.setItem("categories", JSON.stringify(categories));

  showNotification("Налаштування збережено", "success");
  document.getElementById("settings-modal").style.display = "none";

  // Оновлення інтерфейсу
  renderCategories();
  updateCategoryDropdown();
}

// Скидання налаштувань
function resetSettings() {
  settings = {
    autoSave: true,
    showNotifications: true,
    pomodoroDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
  };

  categories = ["робота", "особисте", "навчання", "інше"];

  populateSettingsForm();
  showNotification("Налаштування скинуто", "info");
}

// Заповнення форми налаштувань
function populateSettingsForm() {
  document.getElementById("auto-save").checked = settings.autoSave;
  document.getElementById("show-notifications").checked =
    settings.showNotifications;
  document.getElementById("pomodoro-duration").value =
    settings.pomodoroDuration;
  document.getElementById("short-break-duration").value =
    settings.shortBreakDuration;
  document.getElementById("long-break-duration").value =
    settings.longBreakDuration;

  // Заповнення списку категорій
  const categoryList = document.getElementById("category-list");
  categoryList.innerHTML = "";

  categories.forEach((category) => {
    const categoryItem = document.createElement("div");
    categoryItem.className = "category-item";
    categoryItem.innerHTML = `
            <span>${category}</span>
            <button type="button" class="btn-icon" onclick="removeCategory('${category}')">
                <span class="material-symbols-outlined">delete</span>
            </button>
        `;
    categoryList.appendChild(categoryItem);
  });
}

// Додавання нової категорії
function addCategory() {
  const newCategoryInput = document.getElementById("new-category");
  const newCategory = newCategoryInput.value.trim();

  if (newCategory && !categories.includes(newCategory)) {
    categories.push(newCategory);
    populateSettingsForm();
    newCategoryInput.value = "";
    showNotification(`Категорію "${newCategory}" додано`, "success");
  } else if (categories.includes(newCategory)) {
    showNotification("Така категорія вже існує", "warning");
  }
}

// Видалення категорії
function removeCategory(category) {
  const index = categories.indexOf(category);
  if (index !== -1) {
    categories.splice(index, 1);
    populateSettingsForm();
    showNotification(`Категорію "${category}" видалено`, "info");
  }
}

// Оновлення випадаючого списку категорій
function updateCategoryDropdown() {
  const categorySelect = document.getElementById("task-category");
  categorySelect.innerHTML = "";

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

// Відображення категорій у фільтрах
function renderCategories() {
  // Оновлення випадаючого списку
  updateCategoryDropdown();

  // Оновлення фільтрів
  const categoryFilters = document.getElementById("category-filters");
  categoryFilters.innerHTML = `
        <label class="filter-option">
            <input type="checkbox" data-filter="category" value="all" checked>
            <span>Всі</span>
        </label>
    `;

  categories.forEach((category) => {
    const filterOption = document.createElement("label");
    filterOption.className = "filter-option";
    filterOption.innerHTML = `
            <input type="checkbox" data-filter="category" value="${category}">
            <span>${category}</span>
        `;
    categoryFilters.appendChild(filterOption);
  });

  // Додавання обробників подій
  document
    .querySelectorAll('input[data-filter="category"]')
    .forEach((filter) => {
      filter.addEventListener("change", handleFilterChange);
    });
}

// Обробка зміни фільтрів
function handleFilterChange(e) {
  const filter = e.target;
  const filterType = filter.dataset.filter;
  const filterValue = filter.value;

  // Якщо вибрано "Всі", зняти вибір з інших
  if (filterValue === "all" && filter.checked) {
    document
      .querySelectorAll(`input[data-filter="${filterType}"]`)
      .forEach((input) => {
        if (input.value !== "all") {
          input.checked = false;
        }
      });
    activeFilters[filterType] = ["all"];
  }
  // Якщо вибрано конкретний фільтр, зняти вибір з "Всі"
  else if (filterValue !== "all") {
    const allFilter = document.querySelector(
      `input[data-filter="${filterType}"][value="all"]`
    );
    if (filter.checked) {
      allFilter.checked = false;
      if (activeFilters[filterType].includes("all")) {
        activeFilters[filterType] = [];
      }
      activeFilters[filterType].push(filterValue);
    } else {
      const index = activeFilters[filterType].indexOf(filterValue);
      if (index !== -1) {
        activeFilters[filterType].splice(index, 1);
      }

      // Якщо не вибрано жодного фільтра, вибрати "Всі"
      if (activeFilters[filterType].length === 0) {
        allFilter.checked = true;
        activeFilters[filterType] = ["all"];
      }
    }
  }

  filterTasks();
}

// Фільтрація завдань
function filterTasks() {
  const searchQuery = document
    .getElementById("search-input")
    .value.toLowerCase();

  const filteredTasks = tasks.filter((task) => {
    // Пошук
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery) ||
      (task.description &&
        task.description.toLowerCase().includes(searchQuery));

    // Статус
    const matchesStatus =
      activeFilters.status.includes("all") ||
      activeFilters.status.includes(task.status);

    // Пріоритет
    const matchesPriority =
      activeFilters.priority.includes("all") ||
      activeFilters.priority.includes(task.priority);

    // Категорія
    const matchesCategory =
      activeFilters.category.includes("all") ||
      activeFilters.category.includes(task.category);

    // Термін
    let matchesDue = activeFilters.due.includes("all");

    if (!matchesDue) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const taskDate = task.due_date ? new Date(task.due_date) : null;

      if (activeFilters.due.includes("today") && taskDate) {
        const taskDay = new Date(taskDate);
        taskDay.setHours(0, 0, 0, 0);
        if (taskDay.getTime() === today.getTime()) {
          matchesDue = true;
        }
      }

      if (activeFilters.due.includes("week") && taskDate) {
        const weekLater = new Date(today);
        weekLater.setDate(today.getDate() + 7);
        if (taskDate >= today && taskDate <= weekLater) {
          matchesDue = true;
        }
      }

      if (activeFilters.due.includes("overdue") && taskDate) {
        if (taskDate < today) {
          matchesDue = true;
        }
      }
    }

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority &&
      matchesCategory &&
      matchesDue
    );
  });

  renderFilteredTasks(filteredTasks);
}

// Відображення відфільтрованих завдань
function renderFilteredTasks(filteredTasks) {
  // Очищення списків завдань
  document.querySelectorAll(".task-list").forEach((list) => {
    list.innerHTML = "";
  });

  // Розподіл завдань за статусами
  const todoTasks = filteredTasks.filter((task) => task.status === "todo");
  const inprogressTasks = filteredTasks.filter(
    (task) => task.status === "inprogress"
  );
  const doneTasks = filteredTasks.filter((task) => task.status === "done");

  // Відображення завдань у відповідних колонках
  renderTasksInColumn(todoTasks, "todo");
  renderTasksInColumn(inprogressTasks, "inprogress");
  renderTasksInColumn(doneTasks, "done");

  // Оновлення лічильників
  document.getElementById("todo-count").textContent = todoTasks.length;
  document.getElementById("inprogress-count").textContent =
    inprogressTasks.length;
  document.getElementById("done-count").textContent = doneTasks.length;

  // Оновлення списку, якщо він активний
  if (currentView === "list") {
    renderListView(filteredTasks);
  }
}

// Відображення завдань
function renderTasks() {
  filterTasks();
  updateStatistics();
}

// Відображення завдань у колонці
function renderTasksInColumn(tasks, columnId) {
  const column = document.querySelector(
    `.task-list[data-status="${columnId}"]`
  );

  if (tasks.length === 0) {
    const emptyMessage = document.createElement("div");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = "Немає завдань";
    column.appendChild(emptyMessage);
    return;
  }

  tasks.forEach((task) => {
    const taskCard = createTaskCard(task);
    column.appendChild(taskCard);
  });
}

// Відображення у вигляді списку
function renderListView(filteredTasks = null) {
  const listContent = document.getElementById("list-content");
  listContent.innerHTML = "";

  const tasksToRender = filteredTasks || tasks;

  if (tasksToRender.length === 0) {
    const emptyMessage = document.createElement("div");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = "Немає завдань";
    emptyMessage.style.padding = "1rem";
    emptyMessage.style.textAlign = "center";
    listContent.appendChild(emptyMessage);
    return;
  }

  tasksToRender.forEach((task) => {
    const listRow = document.createElement("div");
    listRow.className = "list-row";

    // Форматування дати
    const dueDate = task.due_date
      ? new Date(task.due_date).toLocaleDateString("uk-UA")
      : "Без терміну";

    // Перевірка на прострочення
    let dueDateClass = "";
    if (task.due_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskDate = new Date(task.due_date);
      if (taskDate < today && task.status !== "done") {
        dueDateClass = "overdue";
      }
    }

    // Статус
    let statusText = "";
    switch (task.status) {
      case "todo":
        statusText = "Потрібно зробити";
        break;
      case "inprogress":
        statusText = "В процесі";
        break;
      case "done":
        statusText = "Виконано";
        break;
    }

    listRow.innerHTML = `
            <div class="list-cell">${task.title}</div>
            <div class="list-cell">${task.category || "Не вказано"}</div>
            <div class="list-cell"><span class="priority priority-${
              task.priority
            }">${getPriorityText(task.priority)}</span></div>
            <div class="list-cell"><span class="due-date ${dueDateClass}">${dueDate}</span></div>
            <div class="list-cell">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${
                      task.progress || 0
                    }%"></div>
                </div>
            </div>
            <div class="list-cell">${statusText}</div>
            <div class="list-cell">
                <div class="task-actions">
                    <button type="button" onclick="viewTaskDetails(${task.id})">
                        <span class="material-symbols-outlined">visibility</span>
                    </button>
                    <button type="button" onclick="editTask(${task.id})">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button type="button" onclick="confirmDeleteTask(${
                      task.id
                    })">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </div>
        `;

    listContent.appendChild(listRow);
  });
}

// Створення картки завдання
function createTaskCard(task) {
  const taskCard = document.createElement("div");
  taskCard.className = `task-card priority-${task.priority}`;
  taskCard.draggable = true;
  taskCard.id = `task-${task.id}`;
  taskCard.dataset.id = task.id;

  // Встановлення обробників подій для перетягування
  taskCard.addEventListener("dragstart", dragStart);
  taskCard.addEventListener("dragend", dragEnd);

  // Форматування дати
  const dueDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString("uk-UA")
    : "Без терміну";

  // Перевірка на прострочення
  let dueDateClass = "";
  if (task.due_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(task.due_date);
    if (taskDate < today && task.status !== "done") {
      dueDateClass = "overdue";
    }
  }

  // HTML-структура картки
  taskCard.innerHTML = `
        <h3>${task.title}</h3>
        <p>${task.description || "Без опису"}</p>
        <div class="task-meta">
            <span class="task-category">${task.category || "Не вказано"}</span>
            <span class="due-date ${dueDateClass}">
                <span class="material-symbols-outlined">event</span>
                ${dueDate}
            </span>
        </div>
        <div class="task-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${
                  task.progress || 0
                }%"></div>
            </div>
        </div>
        <div class="task-actions">
            <button type="button" onclick="viewTaskDetails(${task.id})">
                <span class="material-symbols-outlined">visibility</span>
            </button>
            <button type="button" onclick="editTask(${task.id})">
                <span class="material-symbols-outlined">edit</span>
            </button>
            <button type="button" onclick="confirmDeleteTask(${task.id})">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
    `;

  return taskCard;
}

// Перегляд деталей завдання
function viewTaskDetails(taskId) {
  const task = tasks.find((t) => t.id == taskId);
  if (!task) return;

  // Заповнення модального вікна
  document.getElementById("detail-title").textContent = task.title;
  document.getElementById("detail-description").textContent =
    task.description || "Без опису";

  // Форматування дат
  const createdDate = new Date(task.created_at).toLocaleString("uk-UA");
  document.getElementById("detail-created").textContent = createdDate;

  const dueDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString("uk-UA")
    : "Без терміну";
  document.getElementById("detail-due-date").textContent = dueDate;

  // Статус
  let statusText = "";
  let statusClass = "";
  switch (task.status) {
    case "todo":
      statusText = "Потрібно зробити";
      statusClass = "badge-secondary";
      break;
    case "inprogress":
      statusText = "В процесі";
      statusClass = "badge-warning";
      break;
    case "done":
      statusText = "Виконано";
      statusClass = "badge-success";
      break;
  }

  // Пріоритет
  let priorityClass = "";
  switch (task.priority) {
    case "low":
      priorityClass = "badge-success";
      break;
    case "medium":
      priorityClass = "badge-warning";
      break;
    case "high":
      priorityClass = "badge-danger";
      break;
  }

  document.getElementById(
    "detail-priority"
  ).className = `badge ${priorityClass}`;
  document.getElementById("detail-priority").textContent = getPriorityText(
    task.priority
  );

  document.getElementById("detail-category").className = "badge badge-primary";
  document.getElementById("detail-category").textContent =
    task.category || "Не вказано";

  document.getElementById("detail-status").className = `badge ${statusClass}`;
  document.getElementById("detail-status").textContent = statusText;

  // Прогрес
  document.getElementById("detail-progress").style.width = `${
    task.progress || 0
  }%`;
  document.getElementById("detail-progress-text").textContent = `${
    task.progress || 0
  }%`;

  // Кнопки дій
  document.getElementById("edit-task-btn").onclick = () => {
    document.getElementById("task-details-modal").style.display = "none";
    editTask(task.id);
  };

  document.getElementById("delete-task-btn").onclick = () => {
    document.getElementById("task-details-modal").style.display = "none";
    confirmDeleteTask(task.id);
  };

  // Відображення модального вікна
  document.getElementById("task-details-modal").style.display = "block";
}

// Отримання текстового представлення пріоритету
function getPriorityText(priority) {
  switch (priority) {
    case "low":
      return "Низький";
    case "medium":
      return "Середній";
    case "high":
      return "Високий";
    default:
      return "Середній";
  }
}

// Обробка відправки форми додавання завдання
function handleTaskFormSubmit(e) {
  e.preventDefault();

  const title = document.getElementById("task-title").value;
  const description = document.getElementById("task-description").value;
  const dueDate = document.getElementById("task-due-date").value;
  const priority = document.getElementById("task-priority").value;
  const category = document.getElementById("task-category").value;
  const progress = document.getElementById("task-progress").value;
  const taskId = document.getElementById("task-id").value;

  const taskData = {
    title,
    description,
    due_date: dueDate,
    priority,
    category,
    progress: parseInt(progress),
    status: "todo",
  };

  if (taskId) {
    // Оновлення існуючого завдання
    const index = tasks.findIndex((task) => task.id == taskId);
    if (index !== -1) {
      taskData.status = tasks[index].status;
      taskData.created_at = tasks[index].created_at;
      taskData.id = parseInt(taskId);
      tasks[index] = taskData;

      showNotification("Завдання оновлено", "success");
    }
  } else {
    // Створення нового завдання
    const newTask = {
      ...taskData,
      id: Date.now(),
      created_at: new Date().toISOString(),
    };

    tasks.push(newTask);
    showNotification("Завдання додано", "success");
  }

  // Збереження та оновлення
  if (settings.autoSave) {
    saveTasks();
  }

  // Скидання форми
  e.target.reset();
  document.getElementById("task-id").value = "";
  document.getElementById("progress-value").textContent = "0%";
  document.querySelector(".btn-primary").innerHTML =
    '<span class="material-symbols-outlined">add_task</span> Додати завдання';
  document.getElementById("cancel-edit").style.display = "none";
  currentEditingTask = null;

  renderTasks();
}

// Редагування завдання
function editTask(taskId) {
  const task = tasks.find((t) => t.id == taskId);
  if (!task) return;

  currentEditingTask = task;

  // Заповнення форми даними завдання
  document.getElementById("task-title").value = task.title;
  document.getElementById("task-description").value = task.description || "";
  document.getElementById("task-due-date").value = task.due_date
    ? task.due_date.split("T")[0]
    : "";
  document.getElementById("task-priority").value = task.priority;
  document.getElementById("task-category").value =
    task.category || categories[0];
  document.getElementById("task-progress").value = task.progress || 0;
  document.getElementById("progress-value").textContent = `${
    task.progress || 0
  }%`;
  document.getElementById("task-id").value = task.id;

  // Зміна тексту кнопки та відображення кнопки скасування
  document.querySelector(".btn-primary").innerHTML =
    '<span class="material-symbols-outlined">save</span> Оновити завдання';
  document.getElementById("cancel-edit").style.display = "block";

  // Розгортання форми, якщо вона згорнута
  const formContent = document.querySelector(".form-content");
  if (formContent.classList.contains("collapsed")) {
    formContent.classList.remove("collapsed");
    document.getElementById("toggle-form-btn").innerHTML =
      '<span class="material-symbols-outlined">expand_less</span>';
  }

  // Прокрутка до форми
  document
    .querySelector(".task-form-container")
    .scrollIntoView({ behavior: "smooth" });
}

// Підтвердження видалення завдання
function confirmDeleteTask(taskId) {
  const task = tasks.find((t) => t.id == taskId);
  if (!task) return;

  document.getElementById(
    "confirm-message"
  ).textContent = `Ви впевнені, що хочете видалити завдання "${task.title}"?`;

  confirmCallback = () => deleteTask(taskId);

  document.getElementById("confirm-modal").style.display = "block";
}

// Видалення завдання
function deleteTask(taskId) {
  // Видалення завдання з масиву
  tasks = tasks.filter((task) => task.id != taskId);

  // Збереження та оновлення
  if (settings.autoSave) {
    saveTasks();
  }

  renderTasks();
  showNotification("Завдання видалено", "success");
}

// Функції для перетягування (Drag & Drop)
function dragStart(e) {
  e.dataTransfer.setData("text/plain", e.target.dataset.id);
  e.target.classList.add("dragging");
}

function dragEnd(e) {
  e.target.classList.remove("dragging");
}

function allowDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.add("drag-over");
}

function drop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");

  const taskId = e.dataTransfer.getData("text/plain");
  const newStatus = e.currentTarget.dataset.status;

  // Знаходження завдання
  const task = tasks.find((t) => t.id == taskId);
  if (!task || task.status === newStatus) return;

  // Оновлення статусу
  task.status = newStatus;

  // Автоматичне оновлення прогресу
  if (newStatus === "done" && task.progress < 100) {
    task.progress = 100;
  } else if (newStatus === "inprogress" && task.progress === 0) {
    task.progress = 50;
  }

  // Збереження та оновлення
  if (settings.autoSave) {
    saveTasks();
  }

  renderTasks();
  showNotification("Статус завдання оновлено", "success");
}

// Функції для Pomodoro таймера
function startTimer() {
  if (timerRunning) return;

  timerRunning = true;
  document.getElementById("start-timer").disabled = true;
  document.getElementById("pause-timer").disabled = false;

  // Оновлення кругового прогресу
  const totalSeconds = timerMinutes * 60 + timerSeconds;
  const circumference = 2 * Math.PI * 120;
  const timerProgress = document.getElementById("timer-progress");

  timerInterval = setInterval(() => {
    if (timerSeconds === 0) {
      if (timerMinutes === 0) {
        // Таймер завершено
        clearInterval(timerInterval);
        timerRunning = false;
        document.getElementById("start-timer").disabled = false;
        document.getElementById("pause-timer").disabled = true;

        // Звукове сповіщення
        const audio = new Audio(
          "https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3"
        );
        audio.play();

        // Оновлення статистики
        if (
          document.getElementById("pomodoro-mode").classList.contains("active")
        ) {
          pomodoroCycles++;
          pomodoroTotalTime += settings.pomodoroDuration;
          document.getElementById("pomodoro-cycles").textContent =
            pomodoroCycles;
          document.getElementById(
            "pomodoro-total-time"
          ).textContent = `${pomodoroTotalTime} хв`;
        }

        showNotification("Час вийшов!", "info");
        return;
      }
      timerMinutes--;
      timerSeconds = 59;
    } else {
      timerSeconds--;
    }

    // Оновлення відображення
    updateTimerDisplay();

    // Оновлення кругового прогресу
    const currentSeconds = timerMinutes * 60 + timerSeconds;
    const progress = 1 - currentSeconds / totalSeconds;
    const dashOffset = circumference * progress;
    timerProgress.style.strokeDasharray = circumference;
    timerProgress.style.strokeDashoffset = dashOffset;
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  document.getElementById("start-timer").disabled = false;
  document.getElementById("pause-timer").disabled = true;
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  document.getElementById("start-timer").disabled = false;
  document.getElementById("pause-timer").disabled = true;

  // Встановлення часу відповідно до активного режиму
  if (document.getElementById("pomodoro-mode").classList.contains("active")) {
    timerMinutes = settings.pomodoroDuration;
  } else if (
    document.getElementById("short-break-mode").classList.contains("active")
  ) {
    timerMinutes = settings.shortBreakDuration;
  } else {
    timerMinutes = settings.longBreakDuration;
  }

  timerSeconds = 0;
  updateTimerDisplay();

  // Скидання кругового прогресу
  const timerProgress = document.getElementById("timer-progress");
  timerProgress.style.strokeDashoffset = 0;
}

function setTimerMode(mode) {
  // Видалення активного класу з усіх кнопок
  document.getElementById("pomodoro-mode").classList.remove("active");
  document.getElementById("short-break-mode").classList.remove("active");
  document.getElementById("long-break-mode").classList.remove("active");

  // Встановлення часу відповідно до вибраного режиму
  switch (mode) {
    case "pomodoro":
      timerMinutes = settings.pomodoroDuration;
      document.getElementById("pomodoro-mode").classList.add("active");
      break;
    case "shortBreak":
      timerMinutes = settings.shortBreakDuration;
      document.getElementById("short-break-mode").classList.add("active");
      break;
    case "longBreak":
      timerMinutes = settings.longBreakDuration;
      document.getElementById("long-break-mode").classList.add("active");
      break;
  }

  timerSeconds = 0;
  updateTimerDisplay();

  // Скидання таймера, якщо він запущений
  if (timerRunning) {
    pauseTimer();
    resetTimer();
  }
}

function updateTimerDisplay() {
  document.getElementById("minutes").textContent = timerMinutes
    .toString()
    .padStart(2, "0");
  document.getElementById("seconds").textContent = timerSeconds
    .toString()
    .padStart(2, "0");
}

// Оновлення статистики
function updateStatistics() {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const inProgressTasks = tasks.filter(
    (task) => task.status === "inprogress"
  ).length;

  // Підрахунок прострочених завдань
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueTasks = tasks.filter((task) => {
    if (!task.due_date || task.status === "done") return false;
    const dueDate = new Date(task.due_date);
    return dueDate < today;
  }).length;

  // Оновлення відображення
  document.getElementById("total-tasks").textContent = totalTasks;
  document.getElementById("completed-tasks").textContent = completedTasks;
  document.getElementById("inprogress-tasks").textContent = inProgressTasks;
  document.getElementById("overdue-tasks").textContent = overdueTasks;
}

// Оновлення графіків
function updateCharts() {
  // Графік статусів
  const statusCounts = {
    todo: tasks.filter((task) => task.status === "todo").length,
    inprogress: tasks.filter((task) => task.status === "inprogress").length,
    done: tasks.filter((task) => task.status === "done").length,
  };

  const statusCtx = document.getElementById("status-chart").getContext("2d");
  new Chart(statusCtx, {
    type: "pie",
    data: {
      labels: ["Потрібно зробити", "В процесі", "Виконано"],
      datasets: [
        {
          data: [statusCounts.todo, statusCounts.inprogress, statusCounts.done],
          backgroundColor: ["#6c757d", "#ffc107", "#28a745"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });

  // Графік пріоритетів
  const priorityCounts = {
    low: tasks.filter((task) => task.priority === "low").length,
    medium: tasks.filter((task) => task.priority === "medium").length,
    high: tasks.filter((task) => task.priority === "high").length,
  };

  const priorityCtx = document
    .getElementById("priority-chart")
    .getContext("2d");
  new Chart(priorityCtx, {
    type: "pie",
    data: {
      labels: ["Низький", "Середній", "Високий"],
      datasets: [
        {
          data: [
            priorityCounts.low,
            priorityCounts.medium,
            priorityCounts.high,
          ],
          backgroundColor: ["#28a745", "#ffc107", "#dc3545"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });

  // Графік категорій
  const categoryCounts = {};
  categories.forEach((category) => {
    categoryCounts[category] = tasks.filter(
      (task) => task.category === category
    ).length;
  });

  const categoryCtx = document
    .getElementById("category-chart")
    .getContext("2d");
  new Chart(categoryCtx, {
    type: "bar",
    data: {
      labels: Object.keys(categoryCounts),
      datasets: [
        {
          label: "Кількість завдань",
          data: Object.values(categoryCounts),
          backgroundColor: "#4a6fa5",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
    },
  });

  // Графік продуктивності за тиждень
  const weeklyData = {
    labels: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"],
    datasets: [
      {
        label: "Виконані завдання",
        data: [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: "#28a745",
      },
    ],
  };

  // Заповнення даних за тиждень
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 - неділя, 1 - понеділок, ...
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  startOfWeek.setHours(0, 0, 0, 0);

  tasks.forEach((task) => {
    if (task.status === "done") {
      const completedDate = new Date(
        task.completed_at || task.updated_at || new Date()
      );
      if (completedDate >= startOfWeek) {
        const dayIndex = (completedDate.getDay() + 6) % 7; // Перетворення на індекс (0 - понеділок)
        weeklyData.datasets[0].data[dayIndex]++;
      }
    }
  });

  const weeklyCtx = document.getElementById("weekly-chart").getContext("2d");
  new Chart(weeklyCtx, {
    type: "bar",
    data: weeklyData,
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
    },
  });
}

// Експорт завдань
function exportTasks() {
  const dataStr = JSON.stringify(tasks, null, 2);
  const dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

  const exportFileDefaultName = `tasks-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();

  showNotification("Завдання експортовано", "success");
}

// Імпорт завдань
function importTasks(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const importedTasks = JSON.parse(e.target.result);

      if (Array.isArray(importedTasks)) {
        confirmCallback = () => {
          tasks = importedTasks;
          saveTasks();
          renderTasks();
          showNotification("Завдання імпортовано", "success");
        };

        document.getElementById(
          "confirm-message"
        ).textContent = `Імпортувати ${importedTasks.length} завдань? Це замінить всі поточні завдання.`;
        document.getElementById("confirm-modal").style.display = "block";
      } else {
        showNotification("Невірний формат файлу", "error");
      }
    } catch (error) {
      console.error("Помилка при імпорті завдань:", error);
      showNotification("Помилка при імпорті завдань", "error");
    }

    // Скидання поля вибору файлу
    e.target.value = "";
  };

  reader.readAsText(file);
}

// Функції для роботи з темою
function toggleTheme() {
  const body = document.body;
  const isDarkTheme = body.classList.contains("dark-theme");

  if (isDarkTheme) {
    body.classList.remove("dark-theme");
    body.classList.add("light-theme");
    document.getElementById("theme-toggle").innerHTML =
      '<span class="material-symbols-outlined">dark_mode</span>';
    localStorage.setItem("theme", "light");
  } else {
    body.classList.remove("light-theme");
    body.classList.add("dark-theme");
    document.getElementById("theme-toggle").innerHTML =
      '<span class="material-symbols-outlined">light_mode</span>';
    localStorage.setItem("theme", "dark");
  }
}

function loadTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  const body = document.body;

  if (savedTheme === "dark") {
    body.classList.remove("light-theme");
    body.classList.add("dark-theme");
    document.getElementById("theme-toggle").innerHTML =
      '<span class="material-symbols-outlined">light_mode</span>';
  } else {
    body.classList.remove("dark-theme");
    body.classList.add("light-theme");
    document.getElementById("theme-toggle").innerHTML =
      '<span class="material-symbols-outlined">dark_mode</span>';
  }
}

// Функція для відображення сповіщень
function showNotification(message, type = "info") {
  if (!settings.showNotifications) return;

  // Створення елемента сповіщення
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  // Іконка відповідно до типу
  let icon = "";
  switch (type) {
    case "success":
      icon = "check_circle";
      break;
    case "error":
      icon = "error";
      break;
    case "warning":
      icon = "warning";
      break;
    default:
      icon = "info";
      break;
  }

  notification.innerHTML = `
        <span class="material-symbols-outlined">${icon}</span>
        ${message}
    `;

  // Додавання до DOM
  document.body.appendChild(notification);

  // Анімація появи
  setTimeout(() => {
    notification.classList.add("show");
  }, 10);

  // Автоматичне закриття
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Ініціалізація перетягування для всіх колонок
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".task-list").forEach((column) => {
    column.addEventListener("dragover", allowDrop);
    column.addEventListener("drop", drop);
    column.addEventListener("dragenter", () =>
      column.classList.add("drag-over")
    );
    column.addEventListener("dragleave", () =>
      column.classList.remove("drag-over")
    );
  });
});
