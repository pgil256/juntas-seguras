// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import { styled } from '@mui/material/styles'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import MuiDivider from '@mui/material/Divider'
import { useTranslation } from 'react-i18next';

const getDepositData = () => {
  const { t } = useTranslation();

return [
  {
    logoWidth: 34,
    logoHeight: 35,
    amount: '+$100',
    subtitle: t('deposit') + ' 8.27',
    title: 'Paypal',
    logo: '/images/misc/paypal.png'
  },
  {
    logoWidth: 33,
    logoHeight: 38,
    amount: '+$100',
    title: 'Mastercard',
    subtitle: t('deposit') + ' 7.22',
    logo: '/images/logos/mastercard-label.png'
  },
  {
    logoWidth: 34,
    logoHeight: 35,
    amount: '+$100',
    subtitle: t('deposit') + ' 6.23',
    title: 'Paypal',
    logo: '/images/misc/paypal.png'
  },
  {
    logoWidth: 34,
    logoHeight: 35,
    amount: '+$100',
    subtitle: t('deposit') + ' 5.20',
    title: 'Paypal',
    logo: '/images/misc/paypal.png'
  },
  {
    logoWidth: 34,
    logoHeight: 35,
    amount: '+$100',
    subtitle: t('deposit') + ' 4.24',
    title: 'Paypal',
    logo: '/images/misc/paypal.png'
  }
]
}

const getWithdrawData = () => {
  const { t } = useTranslation();

  return [
  {
    logoWidth: 34,
    logoHeight: 35,
    amount: '-$1,000',
    title: 'American Bank',
    subtitle: t('withdraw') + ' 3/30/22',
    logo: '/images/logos/american-bank.png'
  },
  {
    logoWidth: 34,
    logoHeight: 31,
    amount: '-$1,000',
    title: 'Citi Bank',
    subtitle: t('withdraw') +  ' 3/28/21',
    logo: '/images/logos/citi-bank.png'
  },
  {
    logoWidth: 34,
    logoHeight: 31,
    amount: '-$1,000',
    title: 'Citi Bank',
    subtitle: t('withdraw') + ' 3/29/20',
    logo: '/images/logos/citi-bank.png'
  }
]
}

// Styled Divider component
const Divider = styled(MuiDivider)(({ theme }) => ({
  margin: theme.spacing(5, 0),
  borderRight: `1px solid ${theme.palette.divider}`,
  [theme.breakpoints.down('md')]: {
    borderRight: 'none',
    margin: theme.spacing(0, 5),
    borderBottom: `1px solid ${theme.palette.divider}`
  }
}))

const DepositWithdraw = () => {
  const { t } = useTranslation();
  const depositData = getDepositData();
  const withdrawData = getWithdrawData();

  return (
    <Card sx={{ display: 'flex', justifyContent: 'space-between', flexDirection: ['column', 'column', 'row'] }}>
      <Box sx={{ width: '100%' }}>
        <CardHeader
          title={t('deposit')}
          sx={{ pt: 5.5, alignItems: 'center', '& .MuiCardHeader-action': { mt: 0.6 } }}
           action={<Typography variant='caption'>{t('viewAll')}</Typography>}
          titleTypographyProps={{
            variant: 'h6',
            sx: { lineHeight: '1.6 !important', letterSpacing: '0.15px !important' }
          }}
        />
        <CardContent sx={{ pb: theme => `${theme.spacing(5.5)} !important` }}>
          {depositData.map((item, index) => {
            return (
              <Box
                key={item.title}
                sx={{ display: 'flex', alignItems: 'center', mb: index !== depositData.length - 1 ? 6 : 0 }}
              >
                <Box sx={{ minWidth: 38, display: 'flex', justifyContent: 'center' }}>
                  <img src={item.logo} alt={item.title} width={item.logoWidth} height={item.logoHeight} />
                </Box>
                <Box
                  sx={{
                    ml: 4,
                    width: '100%',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box sx={{ marginRight: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.title}</Typography>
                    <Typography variant='caption'>{item.subtitle}</Typography>
                  </Box>
                  <Typography variant='subtitle2' sx={{ fontWeight: 600, color: 'success.main' }}>
                    {item.amount}
                  </Typography>
                </Box>
              </Box>
            )
          })}
        </CardContent>
      </Box>

      <Divider flexItem />

      <Box sx={{ width: '100%' }}>
        <CardHeader
          title={t('withdraw')}
          sx={{ pt: 5.5, alignItems: 'center', '& .MuiCardHeader-action': { mt: 0.6 } }}
          action={<Typography variant='caption'>{t('viewAll')}</Typography>}
          titleTypographyProps={{
            variant: 'h6',
            sx: { lineHeight: '1.6 !important', letterSpacing: '0.15px !important' }
          }}
        />
        <CardContent sx={{ pb: theme => `${theme.spacing(5.5)} !important` }}>
          {withdrawData.map((item, index) => {
            return (
              <Box
                key={item.title}
                sx={{ display: 'flex', alignItems: 'center', mb: index !== depositData.length - 1 ? 6 : 0 }}
              >
                <Box sx={{ minWidth: 36, display: 'flex', justifyContent: 'center' }}>
                  <img src={item.logo} alt={item.title} width={item.logoWidth} height={item.logoHeight} />
                </Box>
                <Box
                  sx={{
                    ml: 4,
                    width: '100%',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box sx={{ marginRight: 2, display: 'flex', flexDirection: 'column' }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.title}</Typography>
                    <Typography variant='caption'>{item.subtitle}</Typography>
                  </Box>
                  <Typography variant='subtitle2' sx={{ fontWeight: 600, color: 'error.main' }}>
                    {item.amount}
                  </Typography>
                </Box>
              </Box>
            )
          })}
        </CardContent>
      </Box>
    </Card>
  )
}

export default DepositWithdraw
