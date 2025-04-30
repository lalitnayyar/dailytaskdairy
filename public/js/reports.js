document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('searchForm');
    
    searchForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(searchForm);
        const params = new URLSearchParams();
        
        for (let [key, value] of formData.entries()) {
            if (value) {
                params.append(key, value);
            }
        }
        
        try {
            const response = await fetch(`/api/reports?${params.toString()}`);
            const data = await response.json();
            updateResultsTable(data);
        } catch (error) {
            console.error('Error fetching reports:', error);
        }
    });
    
    searchForm.addEventListener('reset', function() {
        setTimeout(() => searchForm.dispatchEvent(new Event('submit')), 0);
    });
});

function updateResultsTable(tasks) {
    const tbody = document.getElementById('resultsTable');
    tbody.innerHTML = '';
    
    tasks.forEach(task => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${task.type}</td>
            <td>${task.title}</td>
            <td>${task.description}</td>
            <td>
                <span class="badge ${task.status === 'open' ? 'bg-warning' : 
                                   task.status === 'in_progress' ? 'bg-primary' : 
                                   'bg-success'}">
                    ${task.status}
                </span>
            </td>
            <td>${task.created_at}</td>
            <td>${task.completed_at || '-'}</td>
            <td>${task.due_time || '-'}</td>
        `;
        tbody.appendChild(row);
    });
}
