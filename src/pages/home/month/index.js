import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Image, ScrollView, Alert, FlatList } from 'react-native';
import RNCalendarEvents from 'react-native-calendar-events';
import moment from 'moment';
import _ from 'lodash';

import { SidemenuAdd, MonthItem } from '@app/components';
import { Colors, SCREEN_WIDTH, MONTH_COLORS } from '@app/helper';
import { getSMonthList, getMonthByName, SMONTH_DATA, getSDayObject, getSDayObjectFromGDay, HOLY_DATA } from '@app/helper/data';
import { MONTH_NAMES } from '@app/assets/images/monthNames';
import { WEEK_DAY_IMAGES } from '@app/assets/images/weekDays';
import { DAY_IMAGES } from '@app/assets/images/days';

const monthList = getSMonthList().filter((item) => !item.isSection);
export default class MonthScreen extends React.Component {
  constructor() {
    super();
    this.state = {
      monthData: [],
      selectedDay: null,
      currentMonth: {},
      events: [],
      monthEvents: [],
      currentIndex: null,
    };
    this.viewabilityConfig = { viewAreaCoveragePercentThreshold: 50 };
    this.flatListRef = null;
  }

  componentDidMount() {
    const { setOptions } = this.props.navigation;
    const { params } = this.props.route;
    const item = (params && params.selectedMonth) || monthList[0];
    setOptions({
      title: `${item.s_month} - ${item.s_year}`,
      headerRight: () => <SidemenuAdd onPress={this.addEvent} />,
    });
    // eslint-disable-next-line react/no-did-mount-set-state
    this.setState({
      monthData: getMonthByName(item.s_month, item.s_year),
      currentMonth: item,
    });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.route.params?.eventId !== this.props.route.params?.eventId) {
      this.onSelectDay(this.state.selectedDay);
      this.fetchEvents(this.state.currentMonth);
    }
  }

  fetchMonthEvents = (item) => {
    RNCalendarEvents.checkPermissions().then((result) => {
      if (result !== 'authorized') {
        RNCalendarEvents.requestPermissions();
      } else {
        const startDate = moment(`${item.from_month}/${item.from_day}/${item.year}`, 'MMMM/D/YYYY');
        RNCalendarEvents.findCalendars().then((e_result) => {
          if (e_result.length > 0) {
            const cIds = e_result.map((sItem) => sItem.id);
            RNCalendarEvents.fetchAllEvents(startDate.toISOString(), startDate.add(30, 'days').toISOString(), cIds).then((res) => {
              this.setState({ monthEvents: _.sortBy(res, (eItem) => eItem.startDate) });
            });
          }
        });
      }
    });
  };

  fetchEvents = (startDate, endDate) => {
    RNCalendarEvents.findCalendars().then((result) => {
      if (result.length > 0) {
        const cIds = result.map((item) => item.id);
        RNCalendarEvents.fetchAllEvents(startDate, endDate, cIds).then((res) => {
          this.setState({
            events: _.sortBy(
              _.sortBy(res, (item) => !item.allDay),
              (eItem) => eItem.startDate,
            ),
          });
        });
      }
    });
  };

  onSelectDay = (index) => {
    const { currentMonth } = this.state;
    this.setState({ selectedDay: index });
    const sDayObject = getSDayObject(index, currentMonth.s_month, currentMonth.s_year) || {};
    const { year, month, day } = sDayObject;
    if (!year || !month || !day) {
      return;
    }
    const startDate = moment(`${month}/${day}/${year}`, 'MMMM/D/YYYY');
    this.fetchEvents(startDate.toISOString(), startDate.add(2, 'days').toISOString());
  };

  goToDetail = () => {
    this.props.navigation.navigate('Detail', { selectedMonth: this.state.currentMonth });
  };

  hasEvent = (index) => {
    const { currentMonth, monthEvents } = this.state;
    const sDayObject = getSDayObject(index, currentMonth.s_month, currentMonth.s_year) || {};
    const { year, month, day } = sDayObject;
    if (!year || !month || !day) {
      return false;
    }
    const mEvents = monthEvents.map((item) => moment(item.startDate).dayOfYear());
    if (mEvents.includes(moment(`${month}/${day}/${year}`, 'MMMM/D/YYYY').dayOfYear())) {
      return true;
    }
    return false;
  };

  addEvent = () => {
    const { currentMonth, selectedDay } = this.state;
    const sDayObject = getSDayObject(selectedDay, currentMonth.s_month, currentMonth.s_year) || {};
    const { year, month, day } = sDayObject;
    if (!year || !month || !day) {
      Alert.alert('Please select valid Sidereal day.');
      return;
    }
    this.props.navigation.navigate('New', { sDayObject });
  };

  renderMonth = () => {
    const { selectedDay, currentMonth, monthEvents } = this.state;
    return <MonthItem selectedDay={selectedDay} onSelectDay={this.onSelectDay} currentMonth={currentMonth} monthEvents={monthEvents} />;
  };

  handleViewableItemsChanged = ({ viewableItems }) => {
    const { setOptions } = this.props.navigation;
    const [itemChanged] = viewableItems;
    const { item: month } = itemChanged;
    setOptions({
      title: `${month.s_month} - ${month.s_year}`,
      headerRight: () => <SidemenuAdd onPress={this.addEvent} />,
    });
    this.fetchMonthEvents(month);
    this.setState({
      selectedDay: null,
      currentMonth: month,
      monthData: getMonthByName(month.s_month, month.s_year),
      monthEvents: [],
      currentIndex: monthList.findIndex((item) => item.key === month.key),
    });
  };

  gotoNextMonth = () => {
    const { currentIndex } = this.state;
    if (this.flatListRef && currentIndex !== monthList.length - 1) {
      this.flatListRef.scrollToIndex({ animated: true, index: currentIndex + 1 });
    }
  };

  gotoPreviousMonth = () => {
    const { currentIndex } = this.state;
    if (this.flatListRef && currentIndex !== 0) {
      this.flatListRef.scrollToIndex({ animated: true, index: currentIndex - 1 });
    }
  };

  gotoCurrentMonth = () => {
    // console.log(getTodayMonthKey());
  };

  gotoHolyDetailView = (key) => {
    this.props.navigation.navigate('HolyDetail', { holy_key: key });
  };

  render() {
    const { monthData, selectedDay, currentMonth, events, monthEvents } = this.state;
    if (monthData.length === 0) {
      return null;
    }
    const sDayObject = getSDayObject(selectedDay, currentMonth.s_month, currentMonth.s_year) || {};
    return (
      <View style={styles.container}>
        <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
        <ScrollView contentContainerStyle={styles.scrollContentStyle}>
          <TouchableOpacity
            style={[
              styles.headerContainer,
              styles.eventNoBorder,
              styles.headerTitleButton,
              { borderColor: MONTH_COLORS[monthData[0].s_year], borderBottomColor: MONTH_COLORS[monthData[0].s_year] },
            ]}
            onPress={this.goToDetail}>
            <View style={styles.monthTextWrapper}>
              <Text style={[styles.monthText, { color: MONTH_COLORS[monthData[0].s_year] }]}>{monthData[0].s_month}</Text>
              <Text style={[styles.dateText, styles.customFont, { color: MONTH_COLORS[monthData[0].s_year] }]}>
                ({SMONTH_DATA[monthData[0].s_month].nickname})
              </Text>
            </View>
            <Image style={styles.monthImage} resizeMode="contain" source={MONTH_NAMES[monthData[0].s_month]} />
          </TouchableOpacity>
          <View style={[styles.headerContainer, { borderBottomColor: MONTH_COLORS[monthData[0].s_year] }]}>
            <Text style={[styles.dateText, { color: MONTH_COLORS[monthData[0].s_year] }]}>
              {monthData[0].month} {monthData[0].day}, {monthData[0].year} - {monthData[monthData.length - 1].month}{' '}
              {monthData[monthData.length - 1].day}, {monthData[monthData.length - 1].year}
            </Text>
          </View>
          <View style={styles.directionWrapper}>
            <TouchableOpacity style={styles.arrowButton} onPress={this.gotoPreviousMonth}>
              <Text>◀︎</Text>
            </TouchableOpacity>
            {/* <TouchableOpacity style={styles.arrowButton} onPress={this.gotoCurrentMonth}>
                <Text>Today</Text>
              </TouchableOpacity> */}
            <TouchableOpacity style={styles.arrowButton} onPress={this.gotoNextMonth}>
              <Text>▶︎</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.calendarContainer, { borderBottomColor: MONTH_COLORS[monthData[0].s_year] }]}>
            <View style={styles.weekDayContainer}>
              {WEEK_DAY_IMAGES.map((item, index) => (
                <View key={index} style={styles.weekDayItem}>
                  <Image style={styles.weekDayImage} resizeMode="contain" source={item} />
                </View>
              ))}
            </View>
            <FlatList
              ref={(ref) => {
                this.flatListRef = ref;
              }}
              horizontal
              contentContainerStyle={styles.monthItemContainer}
              style={styles.monthCardContainer}
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              data={monthList}
              renderItem={this.renderMonth}
              keyExtractor={(item, index) => index.toString()}
              viewabilityConfig={this.viewabilityConfig}
              getItemLayout={(data, index) => ({ length: SCREEN_WIDTH - 10, offset: (SCREEN_WIDTH - 10) * index, index })}
              initialScrollIndex={monthList.findIndex((item) => item.key === currentMonth.key)}
              onViewableItemsChanged={this.handleViewableItemsChanged}
            />
          </View>
          {selectedDay && (
            <View style={styles.agendaContainer}>
              <Text style={styles.detailText}>Dekan Details</Text>
              <View style={styles.detailContainer}>
                <View style={styles.detailImageContainer}>
                  <Image
                    style={[styles.detailImage, selectedDay >= 10 && { height: 15 * 2 }, selectedDay >= 20 && { height: 15 * 3 }]}
                    resizeMode="contain"
                    source={DAY_IMAGES[selectedDay - 1]}
                  />
                </View>
                <View style={styles.detailTextContainer}>
                  <View style={styles.holyWrapper}>
                    {sDayObject && !!sDayObject.holy_year && (
                      <TouchableOpacity style={styles.holyTitleWrapper} onPress={() => this.gotoHolyDetailView(sDayObject.holy_year)}>
                        <Text style={[styles.detailTitleText, styles.holyTitle]}>{sDayObject.holy_year || ''}</Text>
                      </TouchableOpacity>
                    )}
                    {sDayObject && !!sDayObject.holy_week && !!sDayObject.holy_year && <Text style={styles.detailTitleText}> </Text>}
                    {sDayObject && !!sDayObject.holy_week && (
                      <TouchableOpacity style={styles.holyTitleWrapper} onPress={() => this.gotoHolyDetailView(sDayObject.holy_week)}>
                        <Text style={[styles.detailTitleText, styles.holyTitle]}>{sDayObject.holy_week || ''}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text>Dekan week: {sDayObject.dekan_day}</Text>
                  <Text>Neteru: {sDayObject.neteru_week}</Text>
                  <Text>
                    {`${sDayObject.weekday || ''} ${sDayObject.month || ''} ${sDayObject.day || ''}`} ({sDayObject.s_month || ''} {sDayObject.s_day})
                  </Text>
                </View>
              </View>
            </View>
          )}
          <View style={styles.agendaContainer}>
            <View style={styles.flexRow}>
              <Text style={styles.detailText}>{`${selectedDay ? "Today's" : "Months's"} Agenda`}</Text>
              {selectedDay && (
                <TouchableOpacity style={styles.showAllButton} onPress={() => this.setState({ selectedDay: null })}>
                  <Text style={styles.detailText}>Return to Monthly Agenda</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.detailContainer}>
              {selectedDay && (
                <View style={styles.eventListContainer}>
                  {events.map((event) => {
                    if (event.allDay) {
                      return (
                        <View key={event.id} style={styles.eventItemContainer}>
                          <View style={styles.eventTimeWrapper}>
                            <Text style={styles.eventTime}>All-day</Text>
                          </View>
                          <Text style={styles.eventTitle}>{event.title}</Text>
                        </View>
                      );
                    }
                    return (
                      <View key={event.id} style={[styles.eventItemContainer, styles.eventNoBorder]}>
                        <View style={styles.eventTimeWrapper}>
                          <Text style={styles.eventTime}>
                            {moment(event.startDate).format('HH:mm A')} - {moment(event.endDate).format('HH:mm A')}
                          </Text>
                        </View>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                      </View>
                    );
                  })}
                  {events.length === 0 && <Text style={styles.noEventText}>No events</Text>}
                </View>
              )}
              {!selectedDay && (
                <View style={styles.eventListContainer}>
                  {monthEvents.map((event) => {
                    const sDayFromGday = getSDayObjectFromGDay(
                      moment(event.startDate).format('D'),
                      moment(event.startDate).format('MMMM'),
                      moment(event.startDate).format('YYYY'),
                    );
                    if (event.allDay) {
                      return (
                        <View key={event.id} style={[styles.eventItemContainer, styles.eventNoBorder]}>
                          <View style={styles.eventTimeWrapper}>
                            <Text style={styles.eventTime}>{`All-day ${moment(event.startDate).format('MMM D')}`}</Text>
                            <Text style={[styles.eventTime, styles.eventSDayTime]}>
                              {sDayFromGday.s_month} {sDayFromGday.s_day}
                            </Text>
                          </View>
                          <Text style={styles.eventTitle}>{event.title}</Text>
                        </View>
                      );
                    }
                    return (
                      <View key={event.id} style={[styles.eventItemContainer, styles.eventNoBorder]}>
                        <View style={styles.eventTimeWrapper}>
                          <Text style={styles.eventTime}>
                            {moment(event.startDate).format('HH:mm A')} - {moment(event.endDate).format('HH:mm A MMMM D')}
                          </Text>
                          <Text style={[styles.eventTime, styles.eventSDayTime]}>
                            {sDayFromGday.s_month} {sDayFromGday.s_day}
                          </Text>
                        </View>
                        <Text style={styles.eventTitle}>{event.title.trim()}</Text>
                      </View>
                    );
                  })}
                  {monthEvents.length === 0 && <Text style={styles.noEventText}>No events</Text>}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    flex: 1,
  },
  scrollContentStyle: {
    paddingBottom: 50,
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    paddingVertical: 20,
    borderBottomColor: Colors.black,
    borderBottomWidth: 3,
    justifyContent: 'center',
  },
  monthTextWrapper: {
    paddingLeft: 10,
    flex: 1,
    width: '60%',
  },
  monthText: {
    color: Colors.green,
    fontSize: 30,
    textAlign: 'center',
    fontFamily: 'TrajanPro-Bold',
  },
  customFont: {
    fontFamily: 'TrajanPro-Bold',
    textTransform: 'none',
    fontWeight: 'normal',
  },
  monthImage: {
    height: 50,
    width: '40%',
  },
  dateText: {
    fontSize: 15,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  detailText: {
    fontSize: 16,
  },
  calendarContainer: {
    paddingTop: 20,
    marginHorizontal: 5,
    borderBottomColor: Colors.black,
    borderBottomWidth: 3,
  },
  monthCardContainer: {
    marginTop: 20,
  },
  weekDayContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  flexWrap: {
    flexWrap: 'wrap',
    marginVertical: 10,
  },
  weekDayItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayItem: {
    width: '10%',
    alignItems: 'center',
    minHeight: 50,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  sunDayItem: {
    backgroundColor: Colors.lightpink,
    borderRadius: 0,
  },
  sundaySelectedItem: {
    backgroundColor: Colors.green,
    borderRadius: 0,
  },
  weekDayImage: {
    width: '100%',
    height: 70,
  },
  dayImage: {
    width: '100%',
    height: 15,
    marginBottom: 10,
  },
  dayText: {
    color: Colors.gray,
  },
  selectedItem: {
    backgroundColor: Colors.green,
    borderRadius: 15,
  },
  hasEventItem: {
    backgroundColor: Colors.lightgreen,
    borderRadius: 15,
  },
  agendaContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  agendaTitle: {
    fontSize: 16,
  },
  detailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: 8,
    backgroundColor: Colors.white,
    marginTop: 20,
    shadowColor: 'black',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 999,
  },
  detailImageContainer: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    backgroundColor: Colors.green,
    flex: 0.2,
    justifyContent: 'center',
    alignItems: 'center',
    height: 97,
  },
  detailImage: {
    height: 30,
    width: 50,
  },
  detailTextContainer: {
    flex: 0.8,
    paddingHorizontal: 10,
  },
  detailTitleText: {
    fontSize: 18,
    fontWeight: '400',
  },
  eventListContainer: {
    width: '100%',
  },
  eventItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: Colors.green,
    width: '100%',
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  eventNoBorder: {
    borderBottomWidth: 0,
  },
  eventTimeWrapper: {
    flex: 0.3,
  },
  eventTime: {
    color: Colors.green,
  },
  eventSDayTime: {
    color: Colors.main,
  },
  eventTitle: {
    color: Colors.black,
    fontWeight: '400',
    flex: 0.7,
  },
  noEventText: {
    width: '100%',
    textAlign: 'center',
    paddingVertical: 20,
  },
  directionWrapper: {
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  arrowButton: {
    padding: 10,
  },
  headerTitleButton: {
    borderWidth: 3,
    borderBottomWidth: 3,
    marginTop: 10,
    borderRadius: 6,
  },
  showAllButton: {
    shadowColor: 'black',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 999,
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  holyWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  holyTitleWrapper: {
    borderWidth: 1,
    borderColor: Colors.gray,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.green,
  },
  holyTitle: {
    color: Colors.white,
  },
});
