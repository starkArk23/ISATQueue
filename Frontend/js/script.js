document.addEventListener('DOMContentLoaded', function() {
    const NFC_TAP_URL = 'http://localhost:5000/tap-nfc';
    const loginForm = document.querySelector('.form');
    const studentIdInput = document.querySelector('input[name="StudentID"]');
    const passwordInput = document.querySelector('input[type="password"]');
    const loginButton = document.querySelector('.btnn');
    const forgotPasswordLink = document.querySelector('.link a');
    const nfcButton = document.querySelector('.cn');
    const searchButton = document.querySelector('.btn');
    const searchInput = document.querySelector('.srch');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const dashboardLink = document.querySelector('.menu ul li a[href="dashboard.html"]');

    if (loginButton) {
        loginButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            const studentId = studentIdInput.value.trim();
            const password = passwordInput.value.trim();

            if (studentId === '' || password === '') {
                showNotification('Please enter both Student ID and Password', 'error');
                return;
            }

            if (studentId.length >= 5 && password === 'student') {
                showNotification('Login successful! Redirecting to dashboard...', 'success');
                
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('studentId', studentId);
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            } else {
                showNotification('Invalid Student ID or Password', 'error');
            }
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loginButton.click();
            }
        });
    }

    if (studentIdInput) {
        studentIdInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loginButton.click();
            }
        });
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('Please contact the IT Support desk for password recovery', 'info');
        });
    }

    async function handleNFCTap() {
        showNotification('Scanning for NFC card...', 'info');

        const studentId = studentIdInput?.value.trim() || 'MOCK-UID-001';

        try {
            const response = await fetch(NFC_TAP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    student_id: studentId,
                    uid: studentId
                })
            });

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const data = await response.json();
            console.log('NFC tap response:', data);

            if (data && data.error) {
                throw new Error(data.error);
            }

            const queueLabel = data.queue_label || 'A-000';
            localStorage.setItem('assignedQueue', queueLabel);

            if (studentIdInput) {
                studentIdInput.value = studentId;
            }

            showNotification(`NFC tap recorded. Queue: ${queueLabel}`, 'success');
        } catch (error) {
            console.error('NFC tap error:', error);
            showNotification('NFC tap failed. Please try again.', 'error');
        }
    }

    if (nfcButton) {
        nfcButton.addEventListener('click', function(e) {
            e.preventDefault();
            handleNFCTap();
        });
    }

    if (searchButton) {
        searchButton.addEventListener('click', function(e) {
            e.preventDefault();
            const searchTerm = searchInput.value.trim();
            
            if (searchTerm !== '') {
                showNotification(`Searching for: "${searchTerm}"`, 'info');
            } else {
                showNotification('Please enter a search term', 'error');
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchButton.click();
            }
        });
    }

    const menuLinks = document.querySelectorAll('.menu ul li a');
    menuLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            if (this.classList.contains('is-disabled')) {
                return;
            }
            this.style.transform = 'scale(1.1)';
        });
        
        link.addEventListener('mouseleave', function() {
            if (this.classList.contains('is-disabled')) {
                return;
            }
            this.style.transform = 'scale(1)';
        });
    });

    if (!isLoggedIn && dashboardLink) {
        dashboardLink.classList.add('is-disabled');
        dashboardLink.setAttribute('aria-disabled', 'true');
        dashboardLink.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('Please log in to access the live dashboard', 'info');
        });
    }

    if (isLoggedIn && window.location.pathname.includes('index.html')) {
        setTimeout(() => {
            if (confirm('You are already logged in. Go to dashboard?')) {
                window.location.href = 'dashboard.html';
            }
        }, 1000);
    }

    function showNotification(message, type) {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 5px;
            color: white;
            font-family: Arial, sans-serif;
            z-index: 1000;
            animation: slideIn 0.5s ease;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;

        if (type === 'success') {
            notification.style.backgroundColor = '#4CAF50';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#f44336';
        } else {
            notification.style.backgroundColor = '#030083';
        }

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.5s ease';
            setTimeout(() => {
                notification.remove();
                style.remove();
            }, 500);
        }, 3000);
    }
});