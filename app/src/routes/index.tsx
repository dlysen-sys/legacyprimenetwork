import { createBrowserRouter } from 'react-router-dom'
import App from '../App'
import { ProtectedRoute } from './ProtectedRoute'
import { Landing } from '../pages/public/Landing'
import { RewardsPlan } from '../pages/public/RewardsPlan'
import { Login } from '../pages/public/Login'
import { Dashboard } from '../pages/private/Dashboard'
import { Admin } from '../pages/private/Admin'

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/', element: <Landing /> },              // public
      { path: '/rewards', element: <RewardsPlan /> },   // public
      { path: '/login', element: <Login /> },           // public
      {
        element: <ProtectedRoute />,             // everything below needs auth
        children: [
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/admin', element: <Admin /> },   // owner-gated inside the page
        ],
      },
    ],
  },
])
