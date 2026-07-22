import { Navigate } from 'react-router-dom';

/** Legacy /get-started path — single onboarding flow is School Register */
export default function GetStarted() {
  return <Navigate to="/register-school" replace />;
}
