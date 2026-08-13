'use client'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
export default function RevenueChartInner({ data }: { data: { month: string; revenue: number }[] }) { return <ResponsiveContainer width="100%" height={300}><BarChart data={data}><XAxis dataKey="month" /><YAxis /><Tooltip /><Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> }
