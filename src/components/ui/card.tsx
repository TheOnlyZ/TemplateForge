import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border border-border bg-surface shadow-sm transition-shadow',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 overflow-hidden px-5 pt-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children?: ReactNode
}

function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3 className={cn('m-0 text-lg text-text-h', className)} {...props}>
      {children}
    </h3>
  )
}

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

function CardBody({ className, children, ...props }: CardBodyProps) {
  return (
    <div className={cn('flex flex-col gap-4 px-5 py-5', className)} {...props}>
      {children}
    </div>
  )
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div className={cn('flex items-center justify-end gap-2 px-5 pb-5', className)} {...props}>
      {children}
    </div>
  )
}

export { Card, CardHeader, CardTitle, CardBody, CardFooter }
export type { CardProps, CardHeaderProps, CardTitleProps, CardBodyProps, CardFooterProps }
