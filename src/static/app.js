document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const activitySearch = document.getElementById("activity-search");
  const activityCategory = document.getElementById("activity-category");
  const activitySort = document.getElementById("activity-sort");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  let allActivities = {};

  activitySearch.addEventListener("input", renderActivities);
  activityCategory.addEventListener("change", renderActivities);
  activitySort.addEventListener("change", renderActivities);

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      allActivities = await response.json();
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
      activityCategory.innerHTML = '<option value="">All categories</option>';
      const categories = new Set();

      Object.entries(allActivities).forEach(([name, details]) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
        categories.add(details.category || "Other");
      });

      [...categories].sort((left, right) => left.localeCompare(right)).forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        activityCategory.appendChild(option);
      });

      renderActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function renderActivities() {
    const searchTerm = activitySearch.value.trim().toLowerCase();
    const selectedCategory = activityCategory.value;
    const sortMode = activitySort.value;
    const filteredActivities = Object.entries(allActivities).filter(([name, details]) => {
      const category = details.category || "Other";
      const searchableText = [name, details.description, details.schedule, category]
        .join(" ")
        .toLowerCase();

      return (
        (!selectedCategory || category === selectedCategory) &&
        searchableText.includes(searchTerm)
      );
    });

    if (sortMode === "name") {
      filteredActivities.sort(([left], [right]) => left.localeCompare(right));
    } else if (sortMode === "time") {
      filteredActivities.sort(([leftName, left], [rightName, right]) => {
        const timeOrder = (left.start_time || "99:99").localeCompare(right.start_time || "99:99");
        return timeOrder || leftName.localeCompare(rightName);
      });
    }

    activitiesList.innerHTML = "";
    if (filteredActivities.length === 0) {
      activitiesList.innerHTML = '<p class="empty-state">No activities match your filters.</p>';
      return;
    }

    filteredActivities.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft =
        details.max_participants - details.participants.length;

      // Create participants HTML with delete icons instead of bullet points
      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Category:</strong> ${details.category || "Other"}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
      `;

      activitiesList.appendChild(activityCard);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
