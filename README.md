# PDF Flashcard Generator

A Next.js application that uses Google's Gemini AI to generate flashcards from uploaded PDF documents. The application implements spaced repetition to help users learn more effectively - cards answered correctly are shown less frequently, while cards answered incorrectly appear more often.

## ⚠️ Important: API Key Required

**To use this application, you'll need a Gemini API key from [Google AI Studio](https://ai.google.dev/).**

1. Visit [Google AI Studio](https://ai.google.dev/)
2. Create or sign in to your Google account
3. Get your API key from the API Keys section
4. When generating flashcards, enter this key in the application

The API key is never stored on any server and is only used for direct communication with the Gemini API.

## Features

- **PDF Upload**: Upload and process PDF files directly in the browser
- **AI-Powered Flashcard Generation**: Uses Google Gemini AI to generate comprehensive flashcards from PDF content
- **Smart Spaced Repetition**: Cards adjust difficulty based on user performance
- **Progress Tracking**: Monitor your learning progress through statistics
- **Persistent Storage**: Flashcards are saved in local storage for continued learning
- **Responsive Design**: Works on mobile and desktop devices

## Getting Started

### Prerequisites

- Node.js 18 or newer
- pnpm (preferred) or npm

### Installation

1. Clone the repository or download the source code

2. Install dependencies

```bash
pnpm install
```

3. Start the development server

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Using the Application

1. **Upload a PDF**

   - Click on the "Upload & Generate" tab
   - Select a PDF file using the file input
   - Click "Process PDF" to extract the text

2. **Generate Flashcards**

   - After processing the PDF, enter your [Google Gemini API key](https://ai.google.dev/)
   - Specify the number of flashcards you want to generate (5-50)
   - Click "Generate Flashcards"

3. **Study Flashcards**
   - Switch to the "Study Flashcards" tab
   - Use the flashcard interface to test your knowledge
   - Click "Show Answer" to reveal the answer
   - Mark each card as correct or incorrect based on your response
   - The system will prioritize showing cards you find difficult

## Technical Details

### Tech Stack

- **Frontend**: Next.js 15.3+, React 19+
- **UI Components**: ShadCN UI, Tailwind CSS
- **State Management**: Zustand with persistence
- **PDF Processing**: pdf-parse
- **AI Integration**: Google Generative AI (@google/generative-ai)

### Key Components

- **PDF Upload**: Handles file upload and text extraction
- **Flashcard Generator**: Processes content with Gemini API to create flashcards
- **Flashcard Session**: Manages the study session and card presentation
- **Spaced Repetition Algorithm**: Implemented in the store's getNextCard function

## Contributing

Feel free to submit issues or pull requests if you have suggestions for improvements or bug fixes.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
