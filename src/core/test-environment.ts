import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import * as path from 'path';
import { TestEnvironment, MCPServerConfig } from '../types/index.js';

export class TestEnvironmentBuilder {
  /**
   * Create a test environment for benchmark execution
   */
  async createTestEnvironment(config: Partial<TestEnvironment> & { testDir: string }): Promise<TestEnvironment> {
    const { testDir, mcpServer, files = {}, packageJson, setupScripts = [] } = config;

    console.log(`🔧 Setting up test environment: ${path.basename(testDir)}`);

    // Create test directory
    await fs.mkdir(testDir, { recursive: true });

    // Create default package.json if not provided
    const defaultPackageJson = this.getDefaultPackageJson();
    const finalPackageJson = { ...defaultPackageJson, ...packageJson };
    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify(finalPackageJson, null, 2)
    );

    // Create directory structure
    await this.createDirectoryStructure(testDir);

    // Create default files
    await this.createDefaultFiles(testDir, files);

    // Create MCP configuration if server is provided
    if (mcpServer) {
      await this.createMCPConfig(testDir, mcpServer);
    }

    // Install dependencies
    console.log('📦 Installing dependencies...');
    execSync('npm install --no-audit --prefer-offline --ignore-scripts', {
      cwd: testDir,
      timeout: 300000, // 5 minutes
      stdio: 'pipe'
    });

    // Run setup scripts
    for (const script of setupScripts) {
      console.log(`🔧 Running setup script: ${script}`);
      execSync(script, { cwd: testDir, stdio: 'pipe' });
    }

    console.log(`✅ Test environment ready: ${path.basename(testDir)}`);

    return {
      testDir,
      mcpServer,
      files,
      packageJson: finalPackageJson,
      setupScripts
    };
  }

  /**
   * Get default package.json for test projects
   */
  private getDefaultPackageJson(): Record<string, any> {
    return {
      name: 'mcp-test-project',
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint'
      },
      dependencies: {
        'react': '^18',
        'react-dom': '^18',
        'next': '14.2.5',
        '@radix-ui/react-slot': '^1.0.2',
        'class-variance-authority': '^0.7.0',
        'clsx': '^2.1.1',
        'lucide-react': '^0.424.0',
        'tailwind-merge': '^2.5.2',
        'tailwindcss-animate': '^1.0.7',
        '@modelcontextprotocol/sdk': '^1.11.0',
        '@ast-grep/napi': '^0.39.5',
        'ignore': '^7.0.5'
      },
      devDependencies: {
        'typescript': '^5',
        '@types/node': '^20',
        '@types/react': '^18',
        '@types/react-dom': '^18',
        'postcss': '^8',
        'tailwindcss': '^3.4.1',
        'eslint': '^8',
        'eslint-config-next': '14.2.5'
      }
    };
  }

  /**
   * Create standard directory structure
   */
  private async createDirectoryStructure(testDir: string): Promise<void> {
    const dirs = [
      'app',
      'app/components',
      'app/ui',
      'components',
      'components/ui',
      'lib'
    ];

    for (const dir of dirs) {
      await fs.mkdir(path.join(testDir, dir), { recursive: true });
    }
  }

  /**
   * Create default files for testing
   */
  private async createDefaultFiles(testDir: string, customFiles: Record<string, string>): Promise<void> {
    // Default files that provide a realistic test environment
    const defaultFiles: Record<string, string> = {
      'lib/utils.ts': this.getUtilsFile(),
      'components/ui/button.tsx': this.getButtonComponent(),
      'components/ui/card.tsx': this.getCardComponent(),
      'components/ui/input.tsx': this.getInputComponent(),
      'components/task-manager.tsx': this.getTaskManagerComponent(),
      'app/page.tsx': this.getPageComponent(),
      'tailwind.config.js': this.getTailwindConfig(),
      'tsconfig.json': this.getTSConfig(),
      '.gitignore': this.getGitignore(),
      '.searchignore': this.getSearchIgnore(),
      '.search-defaults.json': this.getSearchDefaults()
    };

    // Merge with custom files (custom files override defaults)
    const allFiles = { ...defaultFiles, ...customFiles };

    for (const [filePath, content] of Object.entries(allFiles)) {
      const fullPath = path.join(testDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
    }
  }

  /**
   * Create MCP configuration file
   */
  private async createMCPConfig(testDir: string, mcpServer: MCPServerConfig): Promise<void> {
    const config = {
      mcpServers: {
        [mcpServer.name]: {
          command: mcpServer.command,
          args: mcpServer.args,
          env: mcpServer.env || {}
        }
      }
    };

    await fs.writeFile(
      path.join(testDir, '.claude.json'),
      JSON.stringify(config, null, 2)
    );
  }

  // File content getters (extracted from original test runner)
  private getUtilsFile(): string {
    return `
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}
`;
  }

  private getButtonComponent(): string {
    return `
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
`;
  }

  private getCardComponent(): string {
    return `
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
`;
  }

  private getInputComponent(): string {
    return `
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
`;
  }

  private getTaskManagerComponent(): string {
    return `
'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { formatDate, generateId } from '@/lib/utils'

interface Task {
  id: string
  title: string
  description: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
  dueDate?: Date
}

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' as const })
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  useEffect(() => {
    const savedTasks = localStorage.getItem('tasks')
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks).map((task: any) => ({
        ...task,
        createdAt: new Date(task.createdAt),
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined
      })))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks))
  }, [tasks])

  const addTask = () => {
    if (!newTask.title.trim()) return
    const task: Task = {
      id: generateId(),
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      completed: false,
      createdAt: new Date()
    }
    setTasks(prev => [...prev, task])
    setNewTask({ title: '', description: '', priority: 'medium' })
  }

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id))
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'active') return !task.completed
    if (filter === 'completed') return task.completed
    return true
  })

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Task title..."
            value={newTask.title}
            onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
          />
          <Input
            placeholder="Task description..."
            value={newTask.description}
            onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
          />
          <select
            value={newTask.priority}
            onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as any }))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
          <Button onClick={addTask}>Add Task</Button>
        </CardContent>
      </Card>

      <div className="flex gap-2 mb-4">
        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
          All ({tasks.length})
        </Button>
        <Button variant={filter === 'active' ? 'default' : 'outline'} onClick={() => setFilter('active')}>
          Active ({tasks.filter(t => !t.completed).length})
        </Button>
        <Button variant={filter === 'completed' ? 'default' : 'outline'} onClick={() => setFilter('completed')}>
          Completed ({tasks.filter(t => t.completed).length})
        </Button>
      </div>

      <div className="space-y-4">
        {filteredTasks.map(task => (
          <Card key={task.id} className={task.completed ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className={\`font-medium \${task.completed ? 'line-through' : ''}\`}>
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Priority: {task.priority}</span>
                    <span>Created: {formatDate(task.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleTask(task.id)}
                  >
                    {task.completed ? 'Undo' : 'Complete'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteTask(task.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default TaskManager
`;
  }

  private getPageComponent(): string {
    return `
import { TaskManager } from '@/components/task-manager'

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight">Task Manager</h1>
          <p className="text-muted-foreground mt-4">
            A modern task management application built with Next.js and shadcn/ui
          </p>
        </div>
        <TaskManager />
      </div>
    </main>
  )
}
`;
  }

  private getTailwindConfig(): string {
    return `
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
`;
  }

  private getTSConfig(): string {
    return JSON.stringify({
      compilerOptions: {
        target: 'es5',
        lib: ['dom', 'dom.iterable', 'es6'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
        baseUrl: '.',
        paths: { '@/*': ['./*'] }
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules']
    }, null, 2);
  }

  private getGitignore(): string {
    return `
# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts
`;
  }

  private getSearchIgnore(): string {
    return `
node_modules/**
.next/**
coverage/**
.nyc_output/**
*.log
*.tmp
temp/**
tmp/**
.git/**
.vscode/**
.idea/**
dist/**
build/**
out/**
`;
  }

  private getSearchDefaults(): string {
    return JSON.stringify({
      files: [
        '**/node_modules/**',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
        '**/out/**',
        '**/coverage/**',
        '**/.nyc_output/**',
        '**/.git/**',
        '**/.vscode/**',
        '**/.idea/**',
        '**/*.log',
        '**/*.tmp',
        '**/temp/**',
        '**/tmp/**',
        '**/.DS_Store',
        '**/Thumbs.db',
        '**/*.map',
        '**/*.min.js',
        '**/*.min.css',
        '**/package-lock.json',
        '**/yarn.lock'
      ],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md'],
      directories: [
        'node_modules', '.next', 'dist', 'build', 'out', 'coverage',
        '.nyc_output', '.git', '.vscode', '.idea', 'temp', 'tmp'
      ]
    }, null, 2);
  }
}