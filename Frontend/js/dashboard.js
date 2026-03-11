document.addEventListener('DOMContentLoaded', function() {
    let queueData = {
        currentTicket: 'A-012',
        currentWindow: 1,
        estimatedWaitTime: 18,
        nextTickets: ['A-013', 'A-014', 'A-015'],
        allTickets: [
            { ticket: 'A-012', window: 1, status: 'serving' },
            { ticket: 'A-013', window: null, status: 'waiting' },
            { ticket: 'A-014', window: null, status: 'waiting' },
            { ticket: 'A-015', window: null, status: 'waiting' },
            { ticket: 'A-016', window: null, status: 'waiting' },
            { ticket: 'A-017', window: null, status: 'waiting' }
        ]
    };

    const currentTicketElement = document.querySelector('.current-ticket');
    const timerElement = document.querySelector('.timer');
    const nextListElement = document.querySelector('.next-list');
    const windowTextElement = document.querySelector('.main-number .par b');

    function updateDashboard() {
        if (currentTicketElement) {
            currentTicketElement.textContent = queueData.currentTicket;
        }

        if (timerElement) {
            timerElement.textContent = `${queueData.estimatedWaitTime} MINS`;
        }

        if (windowTextElement) {
            windowTextElement.textContent = `Window ${queueData.currentWindow}`;
        }

        if (nextListElement) {
            const rows = nextListElement.querySelectorAll('.row');
            rows.forEach(row => row.remove());

            queueData.nextTickets.forEach((ticket, index) => {
                const row = document.createElement('div');
                row.className = 'row';
                
                const label = index === 0 ? 'NEXT:' : 'FOLLOWING:';
                
                row.innerHTML = `
                    <span>${label}</span>
                    <b>${ticket}</b>
                `;
                
                nextListElement.appendChild(row);
            });
        }
    }

    function advanceQueue() {
        const servedTicket = queueData.currentTicket;
        
        if (queueData.nextTickets.length > 0) {
            queueData.currentTicket = queueData.nextTickets[0];
            
            queueData.nextTickets = queueData.nextTickets.slice(1);
            
            const lastTicketNumber = parseInt(queueData.nextTickets[queueData.nextTickets.length - 1]?.split('-')[1] || 
                                            queueData.currentTicket.split('-')[1]);
            const newTicketNumber = lastTicketNumber + 1;
            const newTicket = `A-${newTicketNumber.toString().padStart(3, '0')}`;
            queueData.nextTickets.push(newTicket);
            
            queueData.currentWindow = Math.floor(Math.random() * 3) + 1;
            
            queueData.estimatedWaitTime = Math.floor(Math.random() * 16) + 10;
            
            updateDashboard();
            
            showNotification(`Now serving: ${queueData.currentTicket} at Window ${queueData.currentWindow}`, 'info');
            
            if (queueData.nextTickets.length === 0) {
                showNotification('No more tickets in queue', 'warning');
            }
        }
    }

    function addNewTicket() {
        const lastTicket = queueData.nextTickets[queueData.nextTickets.length - 1];
        const lastNumber = parseInt(lastTicket.split('-')[1]);
        const newTicketNumber = lastNumber + 1;
        const newTicket = `A-${newTicketNumber.toString().padStart(3, '0')}`;
        
        queueData.nextTickets.push(newTicket);
        
        updateDashboard();
        
        showNotification(`New ticket registered: ${newTicket}`, 'success');
        
        queueData.estimatedWaitTime += 2;
        if (timerElement) {
            timerElement.textContent = `${queueData.estimatedWaitTime} MINS`;
        }
    }

    let queueInterval = setInterval(advanceQueue, 30000);

    let ticketInterval = setInterval(() => {
        if (Math.random() > 0.5) {
            addNewTicket();
        }
    }, 15000);

    if (!localStorage.getItem('isLoggedIn')) {
        setTimeout(() => {
            if (confirm('You are not logged in. Go to login page?')) {
                window.location.href = 'index.html';
            }
        }, 2000);
    }

    const exitButton = document.querySelector('.btnn a[href="index.html"]');
    if (exitButton) {
        exitButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            clearInterval(queueInterval);
            clearInterval(ticketInterval);
            
            if (confirm('Are you sure you want to exit the dashboard?')) {
                if (confirm('Do you want to logout?')) {
                    localStorage.removeItem('isLoggedIn');
                    localStorage.removeItem('studentId');
                }
                
                window.location.href = 'index.html';
            }
        });
    }

    function simulateRealTimeUpdates() {
        let timeUpdateInterval = setInterval(() => {
            const timerElement = document.querySelector('.timer');
            if (timerElement && timerElement.textContent !== 'LIVE') {
                timerElement.style.transition = 'transform 0.3s';
                timerElement.style.transform = 'scale(1.05)';
                
                setTimeout(() => {
                    timerElement.style.transform = 'scale(1)';
                }, 300);
            }
        }, 5000);
    }

    updateDashboard();
    simulateRealTimeUpdates();

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
        } else if (type === 'warning') {
            notification.style.backgroundColor = '#ff9800';
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

    window.addEventListener('beforeunload', function() {
        clearInterval(queueInterval);
        clearInterval(ticketInterval);
    });
});