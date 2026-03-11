document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'index.html';
        return;
    }

    const NFC_TAP_URL = 'http://localhost:5000/nfc-tap';
    const QUEUE_STATUS_URL = 'http://localhost:5000/queue';
    const useBackendQueue = true;

    const queueSequence = Array.from({ length: 12 }, (_, index) => {
        const numberValue = index + 1;
        return `A-${numberValue.toString().padStart(3, '0')}`;
    });
    const assignedQueueNumber = queueSequence[queueSequence.length - 1];

    let queueData = {
        currentTicket: queueSequence[0],
        currentWindow: 1,
        estimatedWaitTime: 18,
        nextTickets: queueSequence.slice(1),
        allTickets: queueSequence.map((ticket, index) => ({
            ticket,
            window: index === 0 ? 1 : null,
            status: index === 0 ? 'serving' : 'waiting'
        }))
    };

    const currentTicketElement = document.querySelector('.current-ticket');
    const timerElement = document.querySelector('.timer');
    const nextListElement = document.querySelector('.next-list');
    const windowTextElement = document.querySelector('.main-number .par b');
    const assignedQueueElement = document.querySelector('.your-queue-number');
    const logoutButton = document.querySelector('.logout-btn a');

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

    function formatTicketNumber(numberValue) {
        if (typeof numberValue !== 'number' || Number.isNaN(numberValue)) {
            return null;
        }
        return `A-${numberValue.toString().padStart(3, '0')}`;
    }

    function applyQueueStatus(payload) {
        if (!payload || typeof payload !== 'object') {
            return false;
        }

        const status = payload.queue_status || payload.queueStatus || payload;
        if (!status || typeof status !== 'object') {
            return false;
        }

        let updated = false;

        if (typeof status.current_ticket === 'string') {
            queueData.currentTicket = status.current_ticket;
            updated = true;
        } else if (typeof status.currentTicket === 'string') {
            queueData.currentTicket = status.currentTicket;
            updated = true;
        }

        if (typeof status.current_window === 'number') {
            queueData.currentWindow = status.current_window;
            updated = true;
        } else if (typeof status.currentWindow === 'number') {
            queueData.currentWindow = status.currentWindow;
            updated = true;
        }

        if (typeof status.estimated_wait_time === 'number') {
            queueData.estimatedWaitTime = status.estimated_wait_time;
            updated = true;
        } else if (typeof status.estimatedWaitTime === 'number') {
            queueData.estimatedWaitTime = status.estimatedWaitTime;
            updated = true;
        }

        if (Array.isArray(status.next_tickets)) {
            queueData.nextTickets = status.next_tickets.slice();
            updated = true;
        } else if (Array.isArray(status.nextTickets)) {
            queueData.nextTickets = status.nextTickets.slice();
            updated = true;
        }

        if (!updated && typeof status.queue_number === 'number') {
            const ticket = formatTicketNumber(status.queue_number);
            if (ticket && !queueData.nextTickets.includes(ticket)) {
                queueData.nextTickets.push(ticket);
                updated = true;
            }
        }

        return updated;
    }

    async function handleNFCTap(studentId) {
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

            const didUpdate = applyQueueStatus(data);
            if (didUpdate) {
                updateDashboard();
            }
        } catch (error) {
            console.error('NFC tap error:', error);
        }
    }

    function advanceQueue() {
        const servedTicket = queueData.currentTicket;
        
        if (queueData.nextTickets.length > 0) {
            queueData.currentTicket = queueData.nextTickets[0];
            
            queueData.nextTickets = queueData.nextTickets.slice(1);
            
            const lastTicketNumber = parseInt(queueData.nextTickets[queueData.nextTickets.length - 1]?.split('-')[1] ||
                                            queueData.currentTicket.split('-')[1]);
            if (lastTicketNumber < queueSequence.length) {
                const newTicketNumber = lastTicketNumber + 1;
                const newTicket = `A-${newTicketNumber.toString().padStart(3, '0')}`;
                queueData.nextTickets.push(newTicket);
            }
            
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
        if (lastNumber >= queueSequence.length) {
            return;
        }
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

    let queueInterval = null;
    let ticketInterval = null;

    if (!useBackendQueue) {
        queueInterval = setInterval(advanceQueue, 30000);
        ticketInterval = setInterval(() => {
            if (Math.random() > 0.5) {
                addNewTicket();
            }
        }, 15000);
    }


    const exitButton = document.querySelector('.exit-dashboard a');
    if (exitButton) {
        exitButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (queueInterval) {
                clearInterval(queueInterval);
            }
            if (ticketInterval) {
                clearInterval(ticketInterval);
            }
            
            if (confirm('Are you sure you want to exit the dashboard?')) {
                if (confirm('Do you want to logout?')) {
                    localStorage.removeItem('isLoggedIn');
                    localStorage.removeItem('studentId');
                }
                
                window.location.href = 'index.html';
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('studentId');
            window.location.href = 'index.html';
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

    function updateAssignedQueue() {
        if (!assignedQueueElement) {
            return;
        }
        const storedQueue = localStorage.getItem('assignedQueue');
        assignedQueueElement.textContent = storedQueue || assignedQueueNumber;
    }

    async function refreshNowServing() {
        if (!useBackendQueue) {
            return;
        }
        try {
            const response = await fetch(QUEUE_STATUS_URL);
            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }
            const data = await response.json();
            const currentLabel = data.current_queue_label || 'A-000';

            if (currentTicketElement) {
                currentTicketElement.textContent = currentLabel;
            }
        } catch (error) {
            console.error('Queue refresh error:', error);
        }
    }

    updateAssignedQueue();
    refreshNowServing();
    if (useBackendQueue) {
        setInterval(refreshNowServing, 5000);
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
        if (queueInterval) {
            clearInterval(queueInterval);
        }
        if (ticketInterval) {
            clearInterval(ticketInterval);
        }
    });

    window.handleNFCTap = handleNFCTap;
});