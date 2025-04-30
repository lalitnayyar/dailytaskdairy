# Daily Task Diary

A comprehensive daily task management application built with Node.js and SQLite, designed to help users efficiently manage their daily schedules, important tasks, and todo lists.

## Features

1. **Daily Schedule Management**
   - Hour-by-hour schedule planning
   - Navigate between past, present, and future dates
   - Easy task addition and modification

2. **Important Tasks**
   - Track high-priority tasks
   - Status tracking (Open/In Progress/Closed)
   - Task completion timestamps

3. **Todo Lists**
   - Create and manage todo items
   - Set due times for tasks
   - Mark tasks as complete

4. **Data Management**
   - Persistent storage using SQLite
   - Option to reset or retain data
   - Historical data preservation

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/lalitnayyar/dailytaskdairy.git
   cd dailytaskdairy
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Technologies Used

- Node.js
- Express.js
- SQLite3
- EJS Templates
- Bootstrap 5
- Moment.js

## Project Structure

```
dailytaskdairy/
├── database.js      # Database configuration and schema
├── server.js        # Express server and routes
├── public/          # Static assets
│   ├── css/        # Stylesheets
│   └── js/         # Client-side JavaScript
├── views/          # EJS templates
│   ├── index.ejs   # Main application view
│   └── settings.ejs # Settings page
└── package.json    # Project dependencies
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

## License

MIT License - feel free to use this project for your own purposes.

## Author

Lalit Nayyar
