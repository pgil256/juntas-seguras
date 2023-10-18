// ** MUI Imports
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import { styled, useTheme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next';

// Styled component for the triangle shaped background image
const TriangleImg = styled('img')({
  right: 0,
  bottom: 0,
  height: 170,
  position: 'absolute'
})

// Styled component for the trophy image
const TrophyImg = styled('img')({
  right: 36,
  bottom: 20,
  height: 98,
  position: 'absolute'
})

const Trophy = () => {
  // ** Hook
  const theme = useTheme();
  const { t } = useTranslation();
  const imageSrc = theme.palette.mode === 'light' ? 'triangle-light.png' : 'triangle-dark.png';

  return (
    <Card sx={{ position: 'relative' }}>
      <CardContent>
        <Typography variant='h6'>{t('congratulations')}</Typography>
        <Typography variant='body2' sx={{ letterSpacing: '0.25px' }}>
          {t('savings')}
        </Typography>
        <Typography variant='h5' sx={{ my: 4, color: 'primary.main' }}>
          $400
        </Typography>
        <Button size='small' variant='contained'>
          {t('viewPayout')}
        </Button>
        <TriangleImg alt='triangle background' src={`/images/misc/${imageSrc}`} />
        <TrophyImg alt='trophy' src='/images/misc/trophy.png' />
      </CardContent>
    </Card>
  );
};

export default Trophy
