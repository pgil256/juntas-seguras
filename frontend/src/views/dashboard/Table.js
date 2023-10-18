// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableRow from '@mui/material/TableRow'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import Typography from '@mui/material/Typography'
import TableContainer from '@mui/material/TableContainer'
import { useTranslation } from 'react-i18next';

const rows = [
  {
    age: 27,
    status: 'paid',
    date: '09/01/2023',
    name: 'Rosa Quispe',
    deposit: '$100',
    email: 'rosa.quispe@gmail.com'
  },
  {
    age: 61,
    date: '09/02/2023',
    deposit: '$100',
    status: 'paid',
    name: 'Maria Flores',
    email: 'maria.flores@gmail.com'
  },
  {
    age: 59,
    date: '09/03/2023',
    name: 'Carmen Rojas',
    status: 'paid',
    deposit: '$100',
    email: 'carmen.rojas@gmail.com'
  },
  {
    age: 30,
    date: '09/04/2023',
    status: 'paid',
    deposit: '$100',
    name: 'Ana Leonarda',
    email: 'ana.leonarda@gmail.com'
  },
  {
    age: 66,
    status: 'paid',
    date: '09/05/2023',
    deposit: '$100',
    name: 'Victoria Martín',
    email: 'victoria.martin@gmail.com'
  },
  {
    age: 33,
    date: '09/06/2023',
    deposit: '$100',
    name: 'Adelina Díaz',
    status: 'paid',
    email: 'adelina.diaz@gmail.com'
  },
  {
    age: 61,
    status: 'paid',
    date: '09/07/2023',
    deposit: '$100',
    name: 'Laura Jacinto',
    email: 'laura.jacinto@gmail.com'
  },
  {
    age: 22,
    date: '09/08/2023',
    deposit: '$100',
    name: 'Rodrigo Scharff',
    status: 'paid',
    email: 'rodrigo.scharff@gmail.com'
  }
]


const statusObj = {
  applied: { color: 'info' },
  rejected: { color: 'error' },
  current: { color: 'primary' },
  resigned: { color: 'warning' },
  professional: { color: 'success' },
  paid: { color: 'success' },
  delinquint: { color: 'warning' }
}

const DashboardTable = () => {
  const { t } = useTranslation();

  return (
    <Card>
      <TableContainer>
        <Table sx={{ minWidth: 800 }} aria-label='table in dashboard'>
          <TableHead>
            <TableRow>
              <TableCell>{t('name')}</TableCell>
              <TableCell>{t('email')}</TableCell>
              <TableCell>{t('date')}</TableCell>
              <TableCell>{t('deposit')}</TableCell>
              <TableCell>{t('age')}</TableCell>
              <TableCell>{t('status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow hover key={row.name} sx={{ '&:last-of-type td, &:last-of-type th': { border: 0 } }}>
                <TableCell sx={{ py: theme => `${theme.spacing(0.5)} !important` }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography sx={{ fontWeight: 500, fontSize: '0.875rem !important' }}>{row.name}</Typography>
                    <Typography variant='caption'>{row.designation}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.deposit}</TableCell>
                <TableCell>{row.age}</TableCell>
                <TableCell>
                  <Chip
                    label={t(row.status)}
                    color={statusObj[row.status].color}
                    sx={{
                      height: 24,
                      fontSize: '0.75rem',
                      textTransform: 'capitalize',
                      '& .MuiChip-label': { fontWeight: 500 }
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  )
}

export default DashboardTable
