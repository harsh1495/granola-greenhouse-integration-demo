import { BrowserRouter, Routes, Route } from 'react-router-dom'

import HomePage from './HomePage'

// Granola pages
import GranolaLayout from './granola/GranolaLayout'
import GranolaHomePage from './granola/HomePage'
import NotesPage from './granola/NotesPage'
import NoteDetailPage from './granola/NoteDetailPage'
import GreenhouseSettingsPanel from './granola/GreenhouseSettingsPanel'

// Shared
import OAuthPage from './components/OAuthPage'

// Greenhouse pages
import GreenhouseLayout from './greenhouse/GreenhouseLayout'
import DashboardPage from './greenhouse/DashboardPage'
import InterviewKitPage from './greenhouse/InterviewKitPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/granola" element={<GranolaLayout />}>
          <Route index element={<GranolaHomePage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="notes/:noteId" element={<NoteDetailPage />} />
          <Route path="integration/greenhouse" element={<GreenhouseSettingsPanel />} />
        </Route>
        <Route path="/oauth/:provider" element={<OAuthPage />} />
        <Route path="/greenhouse" element={<GreenhouseLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="interviews/:interviewId" element={<InterviewKitPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
