// components/Navbar.tsx
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, User, Settings, HelpCircle, LogOut, X } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
};

type NotificationType = {
  id: number;
  message: string;
  date: string;
  read: boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "My Pool", href: "/my-pool" },
  { label: "Payments", href: "/payments" },
];

// Sample notifications
const sampleNotifications: NotificationType[] = [
  {
    id: 1,
    message: "Maria Rodriguez made a deposit of $5",
    date: "2 hours ago",
    read: false,
  },
  {
    id: 2,
    message: "Your next payment is due in 3 days",
    date: "Yesterday",
    read: false,
  },
  {
    id: 3,
    message: "Pool cycle #4 has started",
    date: "1 week ago",
    read: true,
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] =
    useState<NotificationType[]>(sampleNotifications);

  const toggleNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
    if (profileOpen) setProfileOpen(false);
  };

  const toggleProfile = () => {
    setProfileOpen(!profileOpen);
    if (notificationsOpen) setNotificationsOpen(false);
  };

  const markAsRead = (id: number) => {
    setNotifications(
      notifications.map((note) =>
        note.id === id ? { ...note, read: true } : note
      )
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">
                Juntas Seguras
              </h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${
                    pathname === item.href
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <div className="relative">
              <button
                onClick={toggleNotifications}
                className="p-2 text-gray-400 hover:text-gray-500 relative"
                aria-label="Notifications"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-20">
                  <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-900">
                      Notifications
                    </h3>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((note) => (
                        <div
                          key={note.id}
                          className={`p-4 border-b border-gray-200 hover:bg-gray-50 ${
                            !note.read ? "bg-blue-50" : ""
                          }`}
                          onClick={() => markAsRead(note.id)}
                        >
                          <p className="text-sm text-gray-800">
                            {note.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {note.date}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-gray-500">
                        No notifications
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-200">
                    <a
                      href="#"
                      className="block text-center text-sm text-blue-600 hover:text-blue-500"
                    >
                      View all notifications
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="ml-3 relative">
              <button
                onClick={toggleProfile}
                className="p-2 text-gray-400 hover:text-gray-500"
                aria-label="User profile"
              >
                <User className="h-6 w-6" />
              </button>

              {/* Profile dropdown */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg overflow-hidden z-20">
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <span className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </span>
                  </Link>
                  <Link
                    href="/help"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <span className="flex items-center">
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Help
                    </span>
                  </Link>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      // Logout logic would go here
                      console.log("Logging out");
                    }}
                  >
                    <span className="flex items-center">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
