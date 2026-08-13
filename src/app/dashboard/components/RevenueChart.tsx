'use client'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
const Chart = dynamic(() => import('./RevenueChartInner'), { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> })
export default function RevenueChart({ data }: { data: { month: string; revenue: number }[] }) { return <Chart data={data} /> }
