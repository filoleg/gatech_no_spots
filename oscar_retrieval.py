import requests
from requests_futures.sessions import FuturesSession
import io
from bs4 import BeautifulSoup
import re
import json
import pymongo
from pymongo import MongoClient
import time

start_time = time.time()

session = FuturesSession(max_workers=40)

webapp = 'https://oscar.gatech.edu'
sid = "*******"#GTID
pin = "***"#PIN from OSCAR
client = MongoClient()
db = client.no_spots_at_tech_db
sections = db.sections

def auth(sid, pin):
     data = "sid=" + sid + "&PIN=" + pin;
     headers = {'Cookie':'TESTID=set; BIGipServerbpss-web=295882626.24862.0000'}
     
     auth = requests.post(webapp + '/pls/bprod/twbkwbis.P_ValLogin',headers=headers,data=data)       
     sessID = auth.headers['Set-Cookie']
     sessID = sessID[:sessID.find(';')]
     auth_headers = {'Cookie':'TESTID=set;'+sessID+'; BIGipServerbpss-web=295882626.24862.0000'}  
     return auth_headers

def create_classList(sid, pin):

     auth_headers = auth(sid, pin)


     subjects_data = 'p_calling_proc=P_CrseSearch&p_term=201502'
     subjects = requests.post(webapp+'/pls/bprod/bwckgens.p_proc_term_date',data=subjects_data,headers=auth_headers)
     soup0 = BeautifulSoup(subjects.text)
     raw_soup0 = soup0.find_all('option')
     c = 0
     subjectList = []
     for i in raw_soup0:
          subjectList.append(i.get('value'))
          c+=1
          if c > 75:
               break
     print(subjectList)

     secList = open('secList.txt', 'w')     
     for chosenSubject in subjectList:
          courses_data = 'rsts=dummy&crn=dummy&term_in=201502&sel_subj=dummy&sel_day=dummy&sel_schd=dummy&sel_insm=dummy&sel_camp=dummy&sel_levl=dummy&sel_sess=dummy&sel_instr=dummy&sel_ptrm=dummy&sel_attr=dummy&sel_subj=' + chosenSubject + '&sel_crse=&sel_title=&sel_from_cred=&sel_to_cred=&sel_ptrm=%25&begin_hh=0&begin_mi=0&end_hh=0&end_mi=0&begin_ap=x&end_ap=y&path=1&SUB_BTN=Course+Search'
          
          courses = requests.post(webapp+'/pls/bprod/bwskfcls.P_GetCrse',data=courses_data,headers=auth_headers)
          soup1 = BeautifulSoup(courses.text)
          raw_soup1 = soup1.find_all("td", class_="dddefault")
          courseList = []
          c=0
          for i in raw_soup1:
               if (c%2 == 0):
                    courseList.append(i.get_text())

               c+=1

          print(courseList)


          for chosenCourse in courseList:

               aClass_data = 'term_in=201502&sel_subj=dummy&sel_subj=' + chosenSubject + '&SEL_CRSE=' + chosenCourse + '&SEL_TITLE=&BEGIN_HH=0&BEGIN_MI=0&BEGIN_AP=a&SEL_DAY=dummy&SEL_PTRM=dummy&END_HH=0&END_MI=0&END_AP=a&SEL_CAMP=dummy&SEL_SCHD=dummy&SEL_SESS=dummy&SEL_INSTR=dummy&SEL_INSTR=%25&SEL_ATTR=dummy&SEL_ATTR=%25&SEL_LEVL=dummy&SEL_LEVL=%25&SEL_INSM=dummy&sel_dunt_code=&sel_dunt_unit=&call_value_in=&rsts=dummy&crn=dummy&path=1&SUB_BTN=View+Sections'
               secList.write(aClass_data + '\n')

     secList.close()

def bg_cb(sess,resp):#background callback function for asynchronous http requests

     soup = BeautifulSoup(resp.text)

               
     raw_soup = soup.find_all("td", class_="dddefault")
     course_name = raw_soup[2].get_text() + ' ' + raw_soup[3].get_text()
     c = 0
     section_change = 0
     changed = True
     #print(course_name)
     while c < len(raw_soup):
          section = raw_soup[4 + 20*(c//20)].get_text()
          if section == u'\xa0' or raw_soup[1 + 20*(c//20)].get_text() == u'\xa0':#section or CRN
               c += 20
          else:
               if changed == True:
                    aSectionObj = {}
                    aSectionObj["section"] = section
                    aSectionObj["course"] = course_name
                    changed = False
               if (c%20 == 0):
                    aSectionObj["status"] = raw_soup[c].get_text()
               if (c%20 == 1):
                    aSectionObj["CRN"] = raw_soup[c].get_text()
               if (c%20 == 6):
                    aSectionObj["grading_base"] = raw_soup[c].get_text()
               if (c%20 == 7):
                    aSectionObj["credit_hours"] = raw_soup[c].get_text()
               if (c%20 == 8):
                    aSectionObj["title"] = raw_soup[c].get_text()
               if (c%20 == 9):
                    aSectionObj["days"] = raw_soup[c].get_text()
               if (c%20 == 10):
                    aSectionObj["time"] = raw_soup[c].get_text()
               if (c%20 == 11):
                    aSectionObj["total_capacity"] = raw_soup[c].get_text()
               if (c%20 == 12):
                    aSectionObj["students_registered"] = raw_soup[c].get_text()
               if (c%20 == 13):
                    aSectionObj["seats_left"] = raw_soup[c].get_text()
               if (c%20 == 14):
                    aSectionObj["WL_capacity"] = raw_soup[c].get_text()
               if (c%20 == 15):
                    aSectionObj["students_on_WL"] = raw_soup[c].get_text()
               if (c%20 == 16):
                    aSectionObj["WL_seats_left"] = raw_soup[c].get_text()
               if (c%20 == 17):
                    aSectionObj["instructor"] = raw_soup[c].get_text()
               if (c%20 == 18):
                    aSectionObj["location"] = raw_soup[c].get_text()
               if ((c+1)//20 != section_change):#once done with a section, add to the section collection and the db_id to sections of the class dictionary
                    #sections.insert(aSectionObj)#uncomment for building the db
                    sections.update(aSectionObj["CRN"],aSectionObj,True)#uncomment for updating the db

                    changed = True     
               c+=1
          section_change = c//20


def updateSections(sid, pin):
     auth_headers = auth(sid, pin)
     data = []
     with open('secList.txt') as secL:
          for line in secL:
               session.post(webapp+'/pls/bprod/bwskfcls.P_GetCrse',data=line,headers=auth_headers, background_callback=bg_cb)


#createClassList(sid,pin)
updateSections(sid,pin)