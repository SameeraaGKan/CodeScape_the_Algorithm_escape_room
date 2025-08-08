document.addEventListener('DOMContentLoaded', () => {
    // Light/Dark Mode Toggle
    const toggle = document.getElementById('darkModeToggle');
    const headerContainer = document.querySelector('.header-container');
    const aboutText = document.querySelector('.about-text');

    toggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        headerContainer.classList.toggle('light-mode');
        aboutText.classList.toggle('light-mode');
    });


    
    // "JOIN NOW!" button opens the RSVP form modal
    const joinNowBtn = document.getElementById('joinNow');
    const rsvpModal = document.getElementById('inline-rsvp-form');
    const rsvpModalCloseBtn = rsvpModal.querySelector('.close-button');

    joinNowBtn.addEventListener('click', () => {
        rsvpModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });
    
    rsvpModalCloseBtn.addEventListener('click', () => {
        rsvpModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        document.getElementById('rsvp-modal-form').reset();
    });
    
    // Close modal when clicking outside of the content
    window.addEventListener('click', (event) => {
        if (event.target === rsvpModal) {
            rsvpModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            document.getElementById('rsvp-modal-form').reset();
        }
    });

    // Success Modal elements
    const successModal = document.getElementById('success-modal');
    const successMessageH2 = document.getElementById('success-message');

    // Get references to all participant lists on the page
    const allParticipantLists = [
        document.getElementById('participant-list'),
        document.getElementById('modal-participant-list')
    ];

    // Function to handle form submission for both forms
    const handleFormSubmission = (formId, modalToClose = null) => {
        const form = document.getElementById(formId);
        if (!form) return;

        const nameInput = form.querySelector('input[name="name"]');
        const emailInput = form.querySelector('input[name="email"]');
        const teamInput = form.querySelector('input[name="team"]');

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            let isValid = true;

            // Basic validation
            nameInput.classList.remove('invalid-input');
            emailInput.classList.remove('invalid-input');
            teamInput.classList.remove('invalid-input');

            if (nameInput.value.trim() === '') {
                nameInput.classList.add('invalid-input');
                isValid = false;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailInput.value)) {
                emailInput.classList.add('invalid-input');
                isValid = false;
            }
            const teamSize = parseInt(teamInput.value);
            if (isNaN(teamSize) || teamSize < 1 || teamSize > 10) {
                teamInput.classList.add('invalid-input');
                isValid = false;
            }

            if (isValid) {
                // Create a new list item once
                const listItem = document.createElement('li');
                listItem.innerHTML = `<span><strong>${nameInput.value}</strong> (${teamSize} members)</span><span>${emailInput.value}</span>`;

                // Append the new list item to ALL participant lists
                allParticipantLists.forEach(list => {
                    list.appendChild(listItem.cloneNode(true)); // Use cloneNode to add to multiple lists
                });

                // Show the success modal with personalized message
                successMessageH2.textContent = `Thank you, ${nameInput.value}! Your team of ${teamSize} is registered.`;
                successModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
                
                // Close the form modal if it's open
                if (modalToClose) {
                    modalToClose.style.display = 'none';
                }

                // Automatically hide the success modal and reset the form
                setTimeout(() => {
                    successModal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                    form.reset();
                }, 5000); // 5 seconds
            }
        });
    };

    // Initialize form submission logic for both forms
    handleFormSubmission('rsvp-form'); // Main page form
    handleFormSubmission('rsvp-modal-form', rsvpModal); // Modal form
});
