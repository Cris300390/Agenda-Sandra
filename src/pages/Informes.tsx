import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'
import { db } from '../db'
import { getMonthlyIncome, getTopStudentsByIncome, getClassesByMonth, getNoShowRanking } from '../metrics'

const COLORS = ['#fb7185', '#f43f5e', '#fda4af', '#fecdd3', '#9f1239']

export default function Informes() {
  const [income, setIncome] = useState<{ monthKey: string; total: number }[]>([])
  const [topStudents, setTopStudents] = useState<[number, number][]>([])
  const [classesByMonth, setClassesByMonth] = useState<{ monthKey: string; count: number }[]>([])
  const [noShows, setNoShows] = useState<{ studentId: number; rate: number; noShows: number; total: number }[]>([])

  useEffect(() => {
    ;(async () => {
      setIncome(await getMonthlyIncome())
      setTopStudents(await getTopStudentsByIncome())
      setClassesByMonth(await getClassesByMonth())
      setNoShows(await getNoShowRanking())
    })()
  }, [])

  const [studentNames, setStudentNames] = useState<Record<number, string>>({})
  useEffect(() => {
    ;(async () => {
      const ids = topStudents.map(([id]) => id)
      const pairs = await Promise.all(ids.map(async (id) => [id, (await db.students.get(id))?.name || `#${id}`] as const))
      setStudentNames(Object.fromEntries(pairs))
    })()
  }, [topStudents])

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Informes</h2>

      <section>
        <h3>Ingresos por mes</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={income.map(i => ({ name: i.monthKey, total: i.total }))}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#f43f5e" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section>
        <h3>Clases por mes</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={classesByMonth.map(c => ({ name: c.monthKey, count: c.count }))}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#fb7185" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section>
        <h3>Top alumnos por ingresos</h3>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              dataKey="value"
              data={topStudents.map(([id, total]) => ({ name: studentNames[id] || `#${id}`, value: total }))}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {topStudents.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </section>

      <section>
        <h3>Ranking de no-shows</h3>
        <ol>
          {noShows.map((r) => (
            <li key={r.studentId}>
              <strong>{studentNames[r.studentId] || `Alumno #${r.studentId}`}</strong>: {(r.rate * 100).toFixed(0)}% ({r.noShows}/{r.total})
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}


