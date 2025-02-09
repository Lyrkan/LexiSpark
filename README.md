# LexiSpark

LexiSpark is a modern, multilingual word-guessing game built with Next.js. Players can challenge themselves with various word categories in both English and French, including a special daily challenge mode.

## 🌟 Features

- 🎮 Multiple word categories to choose from
- 🌍 Multilingual support (English and French)
- 🎯 Daily challenge with mystery categories
- ⚡ Real-time word validation
- 🎨 Modern, responsive UI with Tailwind CSS
- 🏆 Performance tracking and statistics

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest LTS version recommended)
- npm or yarn
- Docker (optional, for containerized deployment)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Lyrkan/lexispark.git
cd lexispark
```

2. Install dependencies:

```bash
npm ci
```

3. Run the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Docker Deployment

To run the application using Docker:

```bash
docker-compose up -d
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Prisma
- **UI Components**: React 19
- **Icons**: Heroicons

## 📝 License

This project is licensed under the terms included in the LICENSE file.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 🏗️ Project Structure

```
lexispark/
├── app/             # Next.js app directory
├── data/            # Word lists and categories
├── lib/             # Utility functions and helpers
├── prisma/          # Database schema and migrations
├── public/          # Static assets
├── scripts/         # Build and utility scripts
└── types/           # TypeScript type definitions
```
