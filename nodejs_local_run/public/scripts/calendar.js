function openRegistrationModal(dayElement) {
    const date = new Date(dayElement.getAttribute('data-date'));
    const selectedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    document.getElementById('selected-date').value = selectedDate;

    // Show the modal overlay and registration modal
    document.getElementById('modal-overlay').style.display = 'block';
    document.getElementById('registration-modal').style.display = 'block';

    // Get registered pet name from the day element and make it clickable
    const petNameElement = dayElement.querySelector('.registered-pet');
    if (petNameElement) {
        petNameElement.addEventListener('click', function() {
            openPetDetails(petNameElement);
        });
    }
    console.log('Selected Date:', selectedDate);
}

function closeRegistrationModal() {
    console.log("Closing modal..."); // Debugging line
    document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById('registration-modal').style.display = 'none';
}

document.getElementById('registration-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const petName = document.getElementById('pet-name').value;
    console.log("pet-name: " + petName);
    const registrationDate = document.getElementById('selected-date').value;
    console.log("selected-date: " + registrationDate);

    try {
        const response = await fetch('/api/register-pet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pet_name: petName, registration_date: registrationDate })
        });

        if (!response.ok) throw new Error('Failed to register pet');

        alert('Pet registered!');
        closeRegistrationModal(); // Ensure this is being called
        console.log("Modal closed after successful registration."); // Debugging line

        // Update the calendar with the new registration immediately after submitting
        const dayElement = document.querySelector(`[data-date="${registrationDate}"]`);
        const registeredPetElement = dayElement.querySelector('.registered-pet');
        registeredPetElement.innerText = petName;
        registeredPetElement.style.display = 'block'; // Ensure it's visible
        
    } catch (err) {
        console.error('Error:', err);
        alert('Failed to register pet. Please try again.');
    }
});

async function openPetDetails(petNameElement, event) {
    event.stopPropagation(); // Prevent the click event from propagating to the parent day element

    const petId = petNameElement.getAttribute('data-pet-id');
    console.log('Fetching pet details for ID:', petId);

    try {
        const response = await fetch(`/api/pet-details/${petId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch details for pet ID ${petId}: ${response.statusText}`);
        }

        const registrationDetails = await response.json();
        console.log('Pet details received:', registrationDetails);
        console.log('logged in user id:', loggedInUserId);

        document.getElementById('pet-name-details').value = registrationDetails.pet_name || 'asd';
        document.getElementById('selected-date-details').value = registrationDetails.date || 'asd';

            // Debug log for modal content population
            console.log('Populating modal with:', {
                petName: document.getElementById('pet-name-details').value,
                selectedDate: document.getElementById('selected-date-details').value,
            });


        const userId = registrationDetails.user_id;
        console.log('user who registered id:', userId);
        const deleteButton = document.getElementById('delete-button');
        console.log(deleteButton); 
        if (String(userId) === String(loggedInUserId)) {
            deleteButton.disabled = false;
            deleteButton.setAttribute('data-registration-id', registrationDetails.id);
        } else {
            deleteButton.disabled = true;
        }

        document.getElementById('pet-details-modal').style.display = 'block';
        document.getElementById('pet-details-overlay').style.display = 'block';
        console.log('Modal visibility set to block');
    } catch (error) {
        console.error('Error fetching pet details:', error);
    }
}

/*function testModal() {
    // Attempt to get all modal-related elements
    const petNameInput = document.getElementById('pet-name');
    const selectedDateInput = document.getElementById('selected-date');
    const deleteButton = document.getElementById('delete-button');
    const modal = document.getElementById('pet-details-modal');
    const overlay = document.getElementById('pet-details-overlay');

    // Log their existence
    console.log('Modal elements:', {
        petNameInput,
        selectedDateInput,
        deleteButton,
        modal,
        overlay
    });

    // Check if elements exist before manipulating them
    if (!petNameInput || !selectedDateInput || !deleteButton || !modal || !overlay) {
        console.error('One or more modal elements are missing from the DOM.');
        return;
    }

    // Hardcode values
    petNameInput.value = 'Test Pet';
    selectedDateInput.value = '2024-12-28';
    deleteButton.disabled = false;

    // Log updated values
    console.log('Testing modal with hardcoded values:', {
        petName: petNameInput.value,
        selectedDate: selectedDateInput.value,
        deleteButtonDisabled: deleteButton.disabled
    });

    // Force the modal to display
    modal.style.display = 'block';
    overlay.style.display = 'block';

    // Log the display state
    console.log('Modal forcefully displayed:', {
        modalDisplay: modal.style.display,
        overlayDisplay: overlay.style.display
    });
}
*/



function closePetDetailsModal() {
    document.getElementById('pet-details-modal').style.display = 'none';
    document.getElementById('pet-details-overlay').style.display = 'none';
}

function deleteRegistration() {
    const registrationId = document.getElementById('delete-button').getAttribute('data-registration-id');

    fetch(`/api/remove-registration/${registrationId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ registrationId })
    })
    .then(response => {
        if (response.ok) {
            alert('Pet registration removed successfully!');
            closePetDetailsModal(); // Close the modal after deletion
            // Optionally, you can also remove the pet name from the calendar view dynamically
        } else {
            alert('Error removing registration');
        }
    })
    .catch(error => {
        console.error("Error removing registration:", error);
        alert('Error removing registration');
    });
}

// Fetch existing registrations for the current month
(async () => {
    try {
        const response = await fetch(`/api/registrations?month=${formattedMonth}`);
        if (!response.ok) throw new Error('Failed to fetch registrations');

        const data = await response.json();
        data.forEach(registration => {
            const formattedLocalDate = registration.registration_date; // Already formatted as 'YYYY-MM-DD'

            // Select the correct day element
            const dayElement = document.querySelector(`[data-date="${formattedLocalDate}"]`);
            if (dayElement) {
                const registeredPetElement = dayElement.querySelector('.registered-pet');
                if (registeredPetElement) {
                    registeredPetElement.innerText = registration.pet_name;
                    registeredPetElement.style.display = 'block'; // Ensure it's visible
                }
            }
        });
    } catch (err) {
        console.log('Error fetching registrations:', err);
    }
})();