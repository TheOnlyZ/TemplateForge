import './styles/layout.css'
import './features/wizard/box-wizard/BoxWizard.css'
import './features/preview/TemplatePreview.css'
import './features/assembly/AssemblyView.css'
import { AppShell } from './app/AppShell.tsx'
import { useTheme } from './lib/use-theme.ts'

function App() {
  useTheme()
  return <AppShell />
}

export default App
