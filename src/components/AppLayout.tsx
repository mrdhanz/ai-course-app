'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import React from 'react';

const SunIcon = dynamic(() => import('@/components/SunIcon'), { ssr: false })
const MoonIcon = dynamic(() => import('@/components/MoonIcon'), { ssr: false })

const menuItems = [
  { name: 'Course Suggestions', path: '/' },
  { name: 'Courses', path: '/courses' },
]

export default function AppLayout({children}: {children: React.ReactNode}) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      {/* Header/Navigation */}
      <header className="border-b border-islamic-green/20 dark:border-soft-blue/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-islamic-green dark:text-soft-blue">
                AI Course App
              </h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === item.path
                      ? 'bg-islamic-green/10 dark:bg-soft-blue/10 text-islamic-green dark:text-soft-blue'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-islamic-green/5 dark:hover:bg-soft-blue/5'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Theme Toggle */}
            <div className="flex items-center">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="text-islamic-green dark:text-soft-blue border-islamic-green/20 dark:border-soft-blue/20"
              >
                {theme === "dark" ? (
                  <SunIcon className="h-4 w-4" />
                ) : (
                  <MoonIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation (optional) */}
      <div className="md:hidden bg-parchment dark:bg-dark-gray border-b border-islamic-green/20 dark:border-soft-blue/20">
        <div className="container mx-auto px-4 py-2">
          <div className="flex space-x-4 overflow-x-auto">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                  pathname === item.path
                    ? 'bg-islamic-green/10 dark:bg-soft-blue/10 text-islamic-green dark:text-soft-blue'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-islamic-green/5 dark:hover:bg-soft-blue/5'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}