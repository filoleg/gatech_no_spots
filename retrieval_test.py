import requests
import io
from bs4 import BeautifulSoup
import re
import json
import pymongo
from pymongo import MongoClient


webapp = 'https://oscar.gatech.edu'
sid = "902982982"
pin = "221200"
client = MongoClient()
db = client.test_db_69
classes = db.classes
sections = db.sections


def main(sid, pin):
     data = "sid=" + sid + "&PIN=" + pin;
     headers = {'Cookie':'TESTID=set; BIGipServerbpss-web=295882626.24862.0000'}
     
     auth = requests.post(webapp + '/pls/bprod/twbkwbis.P_ValLogin',headers=headers,data=data)       
     sessID = auth.headers['Set-Cookie']
     sessID = sessID[:sessID.find(';')]
     auth_headers = {'Cookie':'TESTID=set;'+sessID+'; BIGipServerbpss-web=295882626.24862.0000'}


     subjects_data = 'p_calling_proc=P_CrseSearch&p_term=201502'
     subjects = requests.post(webapp+'/pls/bprod/bwckgens.p_proc_term_date',data=subjects_data,headers=auth_headers)
     soup0 = BeautifulSoup(subjects.text)
     raw_soup0 = soup0.find_all('option')
     c = 0
     subjectList = []
     for i in raw_soup0:
          #print(i.get_text())
          #print(i.get('value'))
          subjectList.append(i.get('value'))
          c+=1
          if c > 75:
               break
     print(subjectList)
     #chosenSubject = input("Please choose one of the subjects from the list above: ")
     #while chosenSubject not in subjectList:
     #     chosenSubject = input("The subject you chose doesn't exist. Please choose another subject: ")     
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

          #chosenCourse = input("Please choose one of the courses: ")
          #while chosenCourse not in courseList:
          #     chosenCourse = input("The course you chose doesn't exist. Please choose another course: ")

          for chosenCourse in courseList:

               aClass_data = 'term_in=201502&sel_subj=dummy&sel_subj=' + chosenSubject + '&SEL_CRSE=' + chosenCourse + '&SEL_TITLE=&BEGIN_HH=0&BEGIN_MI=0&BEGIN_AP=a&SEL_DAY=dummy&SEL_PTRM=dummy&END_HH=0&END_MI=0&END_AP=a&SEL_CAMP=dummy&SEL_SCHD=dummy&SEL_SESS=dummy&SEL_INSTR=dummy&SEL_INSTR=%25&SEL_ATTR=dummy&SEL_ATTR=%25&SEL_LEVL=dummy&SEL_LEVL=%25&SEL_INSM=dummy&sel_dunt_code=&sel_dunt_unit=&call_value_in=&rsts=dummy&crn=dummy&path=1&SUB_BTN=View+Sections'
               aClass = requests.post(webapp+'/pls/bprod/bwskfcls.P_GetCrse',data=aClass_data,headers=auth_headers)
               soup2 = BeautifulSoup(aClass.text)

               
               raw_soup2 = soup2.find_all("td", class_="dddefault")
               course_title = raw_soup2[8].get_text()
               course_name = chosenSubject + '_' + chosenCourse
               aClassObj = {"course" : course_name, "title" : course_title, "sections": []}

               c = 0
               section_change = 0
               changed = True
               for i in raw_soup2:

                    section = raw_soup2[4 + 20*(c//20)].get_text()
                    if section == u'\xa0' or raw_soup2[1 + 20*(c//20)].get_text() == u'\xa0':#section or CRN
                         break
                    if changed == True:
                         aSectionObj = {}
                         aSectionObj["course"] = course_name
                         changed = False
                    if (c%20 == 0):
                         aSectionObj["status"] = i.get_text()
                    if (c%20 == 1):
                         aSectionObj["CRN"] = i.get_text()
                    if (c%20 == 6):
                         aSectionObj["grading_base"] = i.get_text()
                    if (c%20 == 7):
                         aSectionObj["credit_hours"] = i.get_text()
                    if (c%20 == 8):
                         aSectionObj["title"] = i.get_text()
                    if (c%20 == 9):
                         aSectionObj["days"] = i.get_text()
                    if (c%20 == 10):
                         aSectionObj["time"] = i.get_text()
                    if (c%20 == 11):
                         aSectionObj["total_capacity"] = i.get_text()
                    if (c%20 == 12):
                         aSectionObj["students_registered"] = i.get_text()
                    if (c%20 == 13):
                         aSectionObj["seats_left"] = i.get_text()
                    if (c%20 == 14):
                         aSectionObj["WL_capacity"] = i.get_text()
                    if (c%20 == 15):
                         aSectionObj["students_on_WL"] = i.get_text()
                    if (c%20 == 16):
                         aSectionObj["WL_seats_left"] = i.get_text()
                    if (c%20 == 17):
                         aSectionObj["instructor"] = i.get_text()
                    if (c%20 == 18):
                         aSectionObj["location"] = i.get_text()

                    if ((c+1)//20 != section_change):#once done with a section, add to the section collection and the db_id to sections of the class dictionary
                         section_id = sections.insert(aSectionObj)
                         aClassObj["sections"].append(section_id)
                         changed = True     
                    section_change = c//20



                    c+=1
               classes.insert(aClassObj)
               #print(aClassObj)

main(sid, pin)
          
