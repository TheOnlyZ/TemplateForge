import { Route, Routes } from 'react-router-dom'
import { WorkspacePage } from '../features/workspace/WorkspacePage.tsx'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<WorkspacePage />} />
    </Routes>
  )
}
