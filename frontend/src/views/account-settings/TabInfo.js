// ** React Imports
import { forwardRef, useState } from 'react'

// ** MUI Imports
import Grid from '@mui/material/Grid'
import Radio from '@mui/material/Radio'
import Select from '@mui/material/Select'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import FormLabel from '@mui/material/FormLabel'
import InputLabel from '@mui/material/InputLabel'
import RadioGroup from '@mui/material/RadioGroup'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import OutlinedInput from '@mui/material/OutlinedInput'
import FormControlLabel from '@mui/material/FormControlLabel'

// ** Third Party Imports
import DatePicker from 'react-datepicker'

// ** Styled Components
import DatePickerWrapper from 'src/@core/styles/libs/react-datepicker'

import { useTranslation } from 'react-i18next'

const CustomInput = forwardRef((props, ref) => {
  const { t } = useTranslation()

  return <TextField inputRef={ref} label={t('BirthDate')} fullWidth {...props} />
})

const TabInfo = () => {
  // ** State
  const [date, setDate] = useState(null)

  const { t } = useTranslation()

  return (
    <CardContent>
      <form>
        <Grid container spacing={7}>
          <Grid item xs={12} sx={{ marginTop: 4.8 }}>
            <TextField
              fullWidth
              multiline
              label={t('Bio')}
              minRows={2}
              placeholder={t('BioDefaultValue')}
              defaultValue={t('BioDefaultValue')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DatePickerWrapper>
              <DatePicker
                selected={date}
                showYearDropdown
                showMonthDropdown
                id='account-settings-date'
                placeholderText={t('MM-DD-YYYY')}
                customInput={<CustomInput />}
                onChange={date => setDate(date)}
              />
            </DatePickerWrapper>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type='number' label={t('Phone')} placeholder={t('PhoneNumberFormat')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('Instagram')}
              placeholder={t('InstagramExample')}
              defaultValue={t('InstagramExample')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>{t('Country')}</InputLabel>
              <Select label={t('Country')} defaultValue='USA'>
                <MenuItem value='USA'>USA</MenuItem>
                <MenuItem value='Australia'>Australia</MenuItem>
                <MenuItem value='Argentina'>Argentina</MenuItem>
                <MenuItem value='Bolivia'>Bolivia</MenuItem>
                <MenuItem value='Chile'>Chile</MenuItem>
                <MenuItem value='Colombia'>Colombia</MenuItem>
                <MenuItem value='Costa Rica'>Costa Rica</MenuItem>
                <MenuItem value='Cuba'>Cuba</MenuItem>
                <MenuItem value='Dominican Republic'>Dominican Republic</MenuItem>
                <MenuItem value='Ecuador'>Ecuador</MenuItem>
                <MenuItem value='El Salvador'>El Salvador</MenuItem>
                <MenuItem value='Guatemala'>Guatemala</MenuItem>
                <MenuItem value='Honduras'>Honduras</MenuItem>
                <MenuItem value='Mexico'>Mexico</MenuItem>
                <MenuItem value='Nicaragua'>Nicaragua</MenuItem>
                <MenuItem value='Panama'>Panama</MenuItem>
                <MenuItem value='Paraguay'>Paraguay</MenuItem>
                <MenuItem value='Peru'>Peru</MenuItem>
                <MenuItem value='Puerto Rico'>Puerto Rico</MenuItem>
                <MenuItem value='Spain'>Spain</MenuItem>
                <MenuItem value='Uruguay'>Uruguay</MenuItem>
                <MenuItem value='Venezuela'>Venezuela</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id='form-layouts-separator-multiple-select-label'>{t('Languages')}</InputLabel>
              <Select
                multiple
                defaultValue={['English']}
                id='account-settings-multiple-select'
                labelId='account-settings-multiple-select-label'
                input={<OutlinedInput label={t('Languages')} id='select-multiple-language' />}
              >
                <MenuItem value='English'>English</MenuItem>
                <MenuItem value='French'>French</MenuItem>
                <MenuItem value='Spanish'>Spanish</MenuItem>
                <MenuItem value='Portuguese'>Portuguese</MenuItem>
                <MenuItem value='Italian'>Italian</MenuItem>
                <MenuItem value='German'>German</MenuItem>
                <MenuItem value='Arabic'>Arabic</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl>
              <FormLabel sx={{ fontSize: '0.875rem' }}>{t('Gender')}</FormLabel>
              <RadioGroup row defaultValue='male' aria-label='gender' name='account-settings-info-radio'>
                <FormControlLabel value='male' label={t('Male')} control={<Radio />} />
                <FormControlLabel value='female' label={t('Female')} control={<Radio />} />
                <FormControlLabel value='other' label={t('Other')} control={<Radio />} />
              </RadioGroup>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Button variant='contained' sx={{ marginRight: 3.5 }}>
              {t('SaveChanges')}
            </Button>
            <Button type='reset' variant='outlined' color='secondary' onClick={() => setDate(null)}>
              {t('Reset')}
            </Button>
          </Grid>
        </Grid>
      </form>
    </CardContent>
  )
}

export default TabInfo
