// src/routes.js

import MyMeetings from "./components/MyMeetings";
import SearchPage from "./components/SearchPage";
import CreateMeetingPage from "./components/CreateMeetingPage";
import ProfileView from "./components/ProfileView";
import ProfileEdit from "./components/ProfileEdit";
import MeetingPage from "./components/MeetingPage";

const protectedRoutes = [
  { path: "/", element: <MyMeetings /> },
  { path: "/search", element: <SearchPage /> },
  { path: "/create-meeting", element: <CreateMeetingPage /> },
  { path: "/profile", element: <ProfileView /> },
  { path: "/profile/edit", element: <ProfileEdit /> },
  { path: "/meeting/:id", element: <MeetingPage /> },
];

export default protectedRoutes;
